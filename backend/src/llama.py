# from transformers impor AutoTokenizer, pipeline
# from peft import AutoPeftModelForCausalLM

# def generate_response_llama(query):
#     prompt = "You are a chatbot specializing in optimizing SQL queries within the Oracle syntax ecosystem. Your primary functionality is to provide optimized query. "
#     result = pipe(f"<s>[INST] {prompt+query} [/INST]")
#     chatbot_response = result[0]['generated_text']

#     print(chatbot_response)

#     return chatbot_response