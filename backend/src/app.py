from flask import Flask, request, jsonify
from database.oracle_connection import create_connection,close_connection
import oracledb

from model import generate_response_gpt,generate_response_llama

# from transformers impor AutoTokenizer, pipeline
# from peft import AutoPeftModelForCausalLM


app = Flask(__name__)


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.route('/chatbot/gpt', methods=['POST'])
def chatbot_gpt():
    query = request.json.get('query')
    chatbot_response = generate_response_gpt(query)
    return jsonify({'chatbot_response': chatbot_response})

@app.route('/chatbot/llama', methods=['POST'])
def chatbot_llama():
    query = request.json.get('query')
    chatbot_response = generate_response_llama(query)
    return jsonify({'chatbot_response': chatbot_response})


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
                serialized_results = [dict(zip([desc[0] for desc in cursor.description], row)) for row in results]

                return jsonify(serialized_results)
            else:
                return jsonify({'message': 'No results found for the given query'}), 404
        except oracledb.Error as error:
            print(f"Error executing query: {error}")
            return jsonify({'error': 'Failed to retrieve results'}), 500
        finally:
            close_connection(connection, cursor)


# ##pull llama2 model
# base_model = "frikh-said/query_optimizer_model"
# model = AutoPeftModelForCausalLM.from_pretrained(base_model, load_in_4bit=True)
# tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
# tokenizer.pad_token = tokenizer.eos_token
# tokenizer.padding_side = "right"
# pipe = pipeline(task="text-generation", model=model, tokenizer=tokenizer, max_length=300)
            

port_number = 5000

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=port_number)
