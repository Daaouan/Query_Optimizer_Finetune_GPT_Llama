from flask import Flask, request, jsonify
from openai import OpenAI
import os

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route('/chatbot', methods=['POST'])
def chatbot():
    # Get query from the request
    query = request.json.get('query')
    print(query)

    # Use own fine-tuned model to generate an optimized query
    chatbot_response = generate_response(query)

    # Return the response as JSON
    return jsonify({'chatbot_response': chatbot_response})

def generate_response(query):
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

port_number = 5000

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=port_number)
