from flask import Flask, request, jsonify
from database.oracle_connection import create_connection,close_connection
import oracledb
from openai import OpenAI
import os
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from peft import AutoPeftModelForCausalLM


app = Flask(__name__)

##pull llama2 model
base_model = "frikh-said/query_optimizer_model"
model = AutoPeftModelForCausalLM.from_pretrained(base_model, load_in_4bit=True)
tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"
pipe = pipeline(task="text-generation", model=model, tokenizer=tokenizer, max_length=300)


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.route('/chatbot', methods=['POST'])
def chatbot(llm):
    # Get query from the request
    query = request.json.get('query')
    print(query)

    # Use own fine-tuned model to generate an optimized query
    if llm=='gpt':
        chatbot_response = generate_response_gpt(query)
    elif llm=='llama':
        chatbot_response = generate_response_llama(query)
    # Return the response as JSON
    return jsonify({'chatbot_response': chatbot_response})

def generate_response_gpt(query):
    my_skey = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=my_skey)

    intstructions_string_few_shot = """ShawGPT, You are a chatbot specializing in optimizing SQL queries within the Oracle syntax ecosystem. Your primary functionality is to receive SQL queries from users and provide them with optimized versions for better performance. \

                                    Here are examples of ShawGPT responding to queries.

                                    query: SELECT * FROM Professor WHERE first_name = 'John';
                                    ShawGPT: SELECT professor_id, last_name FROM Professor WHERE first_name = 'John' INDEX(first_name);  -ShawGPT

                                    query: SELECT * FROM Course WHERE course_code = 'MATH101';
                                    ShawGPT: SELECT course_id, course_name, credit_hours FROM Course WHERE course_code = 'MATH101' INDEX(course_code);  -ShawGPT

                                    query: SELECT * FROM Enrollment WHERE student_id IN (10, 20, 30);
                                    ShawGPT: SELECT course_id FROM Enrollment WHERE student_id IN (10, 20, 30) INDEX(student_id); -ShawGPT"""


    response = client.chat.completions.create(
        model="ft:gpt-3.5-turbo-0613:personal::8rDwYEwJ",
        messages=[
        {"role": "system", "content": intstructions_string_few_shot},
        {"role": "user", "content": query}
        ]
    )

    chatbot_response=dict(response)['choices'][0].message.content
    print(chatbot_response)

    return chatbot_response



def generate_response_llama(query):
    prompt = "You are a chatbot specializing in optimizing SQL queries within the Oracle syntax ecosystem. Your primary functionality is to provide optimized query. "
    result = pipe(f"<s>[INST] {prompt+query} [/INST]")
    chatbot_response = result[0]['generated_text']

    print(chatbot_response)

    return chatbot_response



@app.route('/results', methods=['GET'])
def query_results():
    query_param = request.json.get('query')

    if not query_param:
        return jsonify({'error': 'Query parameter is required'}), 400

    connection = create_connection()

    if connection:
        try:
            cursor = connection.cursor()
            cursor.execute(query_param)
            results = cursor.fetchall()

            if results:
                # Assuming the query returns a list of tuples
                serialized_results = [dict(zip([desc[0] for desc in cursor.description], row)) for row in results]

                return jsonify(serialized_results)
            else:
                return jsonify({'message': 'No results found for the given query'}), 404
        except oracledb.Error as error:
            print(f"Error executing query: {error}")
            return jsonify({'error': 'Failed to retrieve results'}), 500
        finally:
            close_connection(connection, cursor)


port_number = 5000

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=port_number)
