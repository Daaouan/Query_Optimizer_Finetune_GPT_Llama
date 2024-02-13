import oracledb
import os

oracle_username = os.getenv("ORACLE_USERNAME")
oracle_password = os.getenv("ORACLE_PASSWORD")
oracle_host = os.getenv("ORACLE_HOST")  
oracle_port = os.getenv("ORACLE_PORT")  
oracle_database_name = os.getenv("ORACLE_DATABASE_NAME")

def create_connection():

    try:
        connection = oracledb.connect(
        user=oracle_username,
        password=oracle_password,
        dsn=f"{oracle_host}:{oracle_port}/{oracle_database_name}"
        )
        return connection
    except oracledb.Error as error:
        print(f"Error connecting to Oracle database: {error}")
        return None

def close_connection(connection):
    if connection:
        connection.close()

def test_connection():
    connection = create_connection()

    if connection:
        try:
            print("Connection successfully established!")
        finally:
            close_connection(connection)

if __name__ == "__main__":
    test_connection()