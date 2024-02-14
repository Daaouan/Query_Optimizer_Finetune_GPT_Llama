from flask import Flask, request, jsonify
from flask_cors import CORS
from database.oracle_connection import create_connection,close_connection
import oracledb

from model import generate_response_gpt,generate_response_llama

# from transformers impor AutoTokenizer, pipeline
# from peft import AutoPeftModelForCausalLM


app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "http://localhost:3000"}})

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


@app.route('/results', methods=['POST'])
def query_results():
    query_param = request.json.get('query')
    print(query_param)
    if not query_param:
        return jsonify({'error': 'Query parameter is required'}), 400

    connection = create_connection()

    if connection:
        try:
            # print(data)
            cursor = connection.cursor()
            cursor.execute(query_param)
            data = cursor.fetchall()
            if data:

                # Get column names
                column_names = [desc[0] for desc in cursor.description]
                # Assuming the query returns a list of tuples

                # Generate execution plan
                cursor.execute("EXPLAIN PLAN FOR " + query_param)

                # Get the execution plan
                cursor.execute("SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY)")
                
                execution_plan = cursor.fetchall()

               # Assuming execution_plan is your original list containing the execution plan data

                formatted_execution_plan = []

                # Iterate over the execution plan starting from index 5
                for row in execution_plan[5:]:
                    # Check if the row contains only dashes, indicating the end of the execution plan table
                    if '-' in row[0]:
                        break
                    else:
                        # Split the row by "|" and strip whitespace from each value
                        row_values = [value.strip() for value in row[0].split("|")]
                        # Check if the row_values list has enough elements
                        if len(row_values) >= 8:
                            formatted_execution_plan.append({
                                'Id': row_values[1],
                                'Operation': row_values[2],
                                'Name': row_values[3],
                                'Rows': row_values[4],
                                'Bytes': row_values[5],
                                'Cost': row_values[6],
                                'Time': row_values[7]
                            })

                print(formatted_execution_plan)


                return jsonify({'result':data , 'columns': column_names, 'execution_plan': formatted_execution_plan})
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
