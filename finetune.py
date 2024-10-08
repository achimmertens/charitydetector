from unsloth import FastLanguageModel
import torch
import os
from transformers import TextStreamer
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import is_bf16_supported

# 1. Configuration
max_seq_length = 2048
dtype = None
load_in_4bit = True
alpaca_prompt = """ Below is an instruction that describes a task, paired with an input and a corresponding response:

### Instruction:
{}

### Input:
{}

### Response:
{} """

instruction = "Create a function to calculate the sum of a sequence of integers."
input = "[1,2,3,4,5]"

# 2. Befrore Training
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Meta-Llama-3.1-8B-bnb-4bit",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
    token = os.getenv("HF_TOKEN")
)

FastLanguageModel.for_inference(model) # Enable native 2x faster inference
inputs = tokenizer(
    [
        alpaca_prompt.format(
            instruction,
            input,
            "", # output - leave this blank for generation!
        )
    ], return_tensor = "pt").to("cuda")
text_streamer = TextStreamer(tokenizer)
_ = model.generate(**inputs, streamer = text_streamer, max_new_tokens = 1000)

EOS_TOKEN = tokenizer.eos_token # Must add EOS_TOKEN
def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    inputs = examples["input"]
    outputs = examples["output"]
    texts= []
    for instruction, input, output in zip(instructions, inputs, outputs):
        text = alpaca_prompt.format(instruction, input, output) + EOS_TOKEN
        texts.append(text)
    return { "text" : texts, }
pass
dataset = load_dataset("iamtarun/python_code_instructions_18k_alpaca", split = "train")
dataset = dataset.map(formatting_prompts_func, batched = True,)

# 4. Training
model = FastLanguageModel.get_peft_model(
    model = model,
    r = 16, # Choose any number > 0 ! Suggested 8,16,32,64,128
    target_modules = ["q_proj","k_proj","v_proj","o_proj",
                      "gate_proj","up_proj","down_proj",],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
    use_rslora = False,
    loftq_config = None,
)

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        # num_train_epochs = 1, # Set this for one full training run
        max_steps = 50,
        learning_rate = 2e-4,
        fp16 = not is_bfloat16_supported(),
        bf16 = is_bfloat16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

# Show current  memory stats
gpu_stats = torch.cuda.get_device_properties(0)
start_gpu_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024,3)
max_memory = round(gpu_stats.total_memory / 1024 / 1024 / 1024,3)
printf(f"GPU = {gpu_stats.name}. Max memory = {max_memory} GB.")
printf(f"Start GPU memory = {start_gpu_memory} GB.")

trainer_stats = trainer.train()

# Show final memory and time stats
used_memory = round(torch.cuda.max_memory_reserved() / 1024  / 1024  / 1024,3)
used_memory_for_lora = round(used_memory - start_gpu_memory, 3)
used_percentage = round((used_memory / max_memory), 3) * 100
lora_precentage = round(used_memory_for_lora/max_memory*100, 3)
print(f"{trainer_stats.metrics['train_runtime']} seconds used for training")
print(f"{round(trainer_stats.metrics['train_runtime']/60,2)} minutes used.")
print(f"Peak reserved memory = {used_memory} GB.")
print(f"Peak reserved memory for training = {used_memory_for_lama} GB.")
print(f"Peak reserved memory % of max memory = {used_percentage} %.")
print(f"Peak reserved memory for training % of max memory = {lora_precentage} %.")

# 5. After Training
FastLanguageModel.for_inference(model) # Enable native 2x faster inference
inputs = tokenizer(
    [
        alpaca_prompt.format(
            instruction,
            input,
            "",
        )
    ], return_tensors = "pt").to("cuda")

text_streamer = TextStreamer(tokenizer) 
_ = model.generate(**inputs, streamer = text_streamer, max_new_tokens = 1000   )

# 6. Save model
model.save_pretrained("lora_model") # local saving
tokenizer.save_pretrained("lora_model") 
model.push_to_hub(huggingface_model_name, token = os.getenv("HF_TOKEN"))
tokenizer.push_to_hub(huggingface_model_name, token = os.getenv("HF_TOKEN"))

# Merge to 16bit
if True: model.save_pretrained_merged("model", tokenizer, save_method = "merged_16bit", )
if True: model.push_to_hub_merged(huggingface_model_name, tokenizer, save_method = "merged_16bit", token = os.getenv("HF_TOKEN"))

