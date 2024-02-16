import React, { useEffect, useState } from "react";
import SQLParser from "node-sql-parser";
import axios from 'axios';

function App() {
  const [selectedOption, setSelectedOption] = useState("lama");
  const [queryResults, setQueryResults] = useState([]);
  const [executionPlan, setExecutionPlan] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [query, setQuery] = useState("");
  const [queryOptimized, setQueryOptimized] = useState("");
  const [columns, setColumns] = useState([]);
  const [activeTab, setActiveTab] = useState("queryResults");
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);

  useEffect(() => {
    // Function to debounce API requests
    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(null, args);
        }, delay);
      };
    };

    // Function to execute SQL query
    const executeQuery = async (query) => {
      try {
        const response = await axios.post("http://localhost:5000/results", { query }, { headers: { "Content-Type": "application/json" } });
        if (!response.data) throw new Error("Failed to fetch data");
        setQueryResults(response.data.result);
        setExecutionPlan(response.data.execution_plan);
        setColumns(response.data.columns);
        setCurrentPage(1);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    // Function to optimize query using the selected option
    const optimizeQuery = async (inputQuery, selectedOption) => {
      const apiUrl = selectedOption === "gpt3" ? "http://localhost:5000/chatbot/gpt" : "http://localhost:5000/chatbot/llama";
      try {
        const response = await axios.post(apiUrl, { query: inputQuery }, { headers: { "Content-Type": "application/json" } });
        if (!response.data) throw new Error("Failed to fetch data");
        setQueryOptimized(response.data.chatbot_response);
        return response.data;
      } catch (error) {
        console.log(`Error fetching ${selectedOption} data:`, error);
      }
    };  

    // SQL keywords for suggestions
    const sqlKeywords = [
      "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "LIMIT", "OFFSET", "JOIN", "INNER JOIN", "LEFT JOIN",
      "RIGHT JOIN", "OUTER JOIN", "ON", "AND", "OR", "NOT", "HAVING", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
      "DELETE", "DISTINCT", "AS", "IS NULL", "IS NOT NULL", "BETWEEN", "IN", "LIKE", "COUNT", "SUM", "MAX", "MIN",
      "AVG", "AS", "ASC", "DESC",
    ];

    // SQL Parser instance
    const parser = new SQLParser.Parser();

    // Input field element
    const inputField = document.getElementById("sqlInput");

    // Suggestions list element
    const suggestionList = document.getElementById("suggestionList");

    // Output message element
    const outputMessage = document.getElementById("outputMessage");

    // Optimize button element
    const optimizeButtonGPT = document.getElementById("optimizeButtonGPT");
    const optimizeButtonLlama = document.getElementById("optimizeButtonLlama");
    // Result button element
    const resultButton = document.getElementById("resultButton");

    // Query label element
    const queryLabel = document.getElementById("queryLabel");

    // Optimized query field element
    const optimizedQueryField = document.getElementById("optimizedQuery");

    // Update suggestions based on user input
    const updateSuggestions = (query) => {
      const currentWord = query.split(" ").pop();
      if (currentWord) {
        const matchingKeywords = sqlKeywords.filter((keyword) => keyword.startsWith(currentWord));
        displaySuggestions(matchingKeywords);
      } else {
        hideSuggestions();
      }
    };

    // Display suggestions
    const displaySuggestions = (suggestions) => {
      suggestionList.innerHTML = suggestions.map(suggestion => `<li>${suggestion}</li>`).join("");
      suggestionList.style.display = "block";
    };

    // Hide suggestions
    const hideSuggestions = () => {
      suggestionList.style.display = "none";
    };

    // Update query label with syntax highlighting
    const updateQueryLabel = (query) => {
      const coloredQuery = query.replace(
        new RegExp(`\\b(${sqlKeywords.join("|")})\\b`, "gi"),
        '<span class="keyword">$1</span>'
      );
      queryLabel.innerHTML = `Your Query: ${coloredQuery}`;
    };

    // Event listener for input field to handle debounced input
    inputField.addEventListener("input", debounce(function () {
      const sqlQuery = inputField.value.trim().toUpperCase();
      if (sqlQuery === "") {
        // optimizeButtonGPT.disabled = true;
        // optimizeButtonLlama.disabled = true;
        // resultButton.disabled = true;
      } else {
        updateSuggestions(sqlQuery);
        try {
          parser.astify(sqlQuery);
          outputMessage.innerText = "Keep up the good work!";
          outputMessage.classList.remove("error");
          outputMessage.classList.add("success");
          // optimizeButtonGPT.disabled = false;
          // optimizeButtonLlama.disabled = false;
          // resultButton.disabled = false;
          resultButton.onclick = handleViewResultButtonClick;
          updateQueryLabel(sqlQuery);
        } catch (error) {
          outputMessage.innerText = "Error SQL Statement";
          outputMessage.classList.add("error");
          outputMessage.classList.remove("success");
          // optimizeButtonGPT.disabled = true;
          // optimizeButtonLlama.disabled = true;
          // resultButton.disabled = true;
          console.error(error);
        }
      }
    }, 500));

    // Event listener for suggestions list
    suggestionList.addEventListener("click", function (event) {
      const selectedSuggestion = event.target.innerText;
      const currentQuery = inputField.value.trim().toUpperCase();
      const words = currentQuery.split(" ");
      words.pop();
      const newQuery = words.join(" ") + " " + selectedSuggestion;
      inputField.value = newQuery;
      inputField.focus();
      updateSuggestions(newQuery);
    });

    // Event listener for optimize button
    optimizeButtonGPT.addEventListener("click", async () => {
      const sqlQuery = inputField.value.trim();
      const optimizedResponse = await optimizeQuery(sqlQuery, "gpt3");
      if (optimizedResponse) {
        optimizedQueryField.value = optimizedResponse.chatbot_response;
      }
      await executeQuery(sqlQuery);
    });

    optimizeButtonLlama.addEventListener("click", async () => {
      const sqlQuery = inputField.value.trim();
      const optimizedResponse = await optimizeQuery(sqlQuery, "lama");
      if (optimizedResponse) {
        optimizedQueryField.value = optimizedResponse.chatbot_response;
      }
      await executeQuery(sqlQuery);
    });
    // Update query label with syntax highlighting



  }, [selectedOption]);

  const handleSelectChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedOption(selectedValue);
  };

  const handleViewResultButtonClick = () => {
    setShowResults((prevShowResults) => !prevShowResults);
  };
  

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = queryResults.slice(indexOfFirstResult, indexOfLastResult);

  return (
    <div className="container">
      <h1 className="text-center mb-4" style={{ fontFamily: "Arial, sans-serif", fontWeight: "bold", color: "#007bff" }}>
        <span style={{ fontStyle: "italic" }}>Neo V2 </span>
        <span style={{ color: "#555" }}>Optimizer</span>
        <button type="button" className="btn btn-sm btn-transparent" data-bs-toggle="modal" data-bs-target="#infoModal">
          <i className="bi bi-info-circle" style={{ color: "#007bff", fontSize: "1.5rem" }}></i>
        </button>
      </h1>

      <div className="row">
        <div className="col-md-6">
          <label htmlFor="sqlInput" className="form-label">My Query</label>
          <div className="input-container">
            <textarea id="sqlInput" rows="6" className="form-control" placeholder="Enter SQL Query..." value={query} onChange={(e) => setQuery(e.target.value)}></textarea>
          </div>
          <ul id="suggestionList"></ul>
          <div id="outputMessage"></div>
          <div className="d-flex align-items-center mt-3">
            {/* <select id="optimizerSelect" className="form-select form-select-sm me-3" onChange={handleSelectChange} value={selectedOption}>
              <option value="lama">Lama (Meta)</option>
              <option value="gpt3">GPT-3 (OpenAI)</option>
            </select> */}
            <button id="optimizeButtonGPT" className="optimizeButton btn btn-primary btn-md me-3 w-100">GPT Optimizer</button>
            <button id="optimizeButtonLlama" className="optimizeButton btn btn-info btn-md me-3 w-100">Llama Optimizer</button>
            <button id="resultButton" className="btn btn-outline-secondary btn-md me-3 w-100" onClick={handleViewResultButtonClick}>{showResults ? "Hide Results" : "View Results"}</button>
          </div>
        </div>
        <div className="col-md-6">
          <label htmlFor="optimizedQuery" className="form-label">Optimized Query</label>
          <div className="input-container">
          <textarea id="optimizedQuery" rows="6" className="form-control" value={queryOptimized} placeholder="Optimized Query" disabled onChange={(e) => setQueryOptimized(e.target.value)}></textarea>
          </div>
          <p id="queryLabel">Your Query:</p>
        </div>
      </div>

      {showResults && (
        <div className="query-results-container">
          {/* Navigation tabs */}
          <ul className="nav nav-tabs mt-5">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "queryResults" ? "active" : ""}`}
                onClick={() => setActiveTab("queryResults")}
              >
                Query Results
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "executionPlan" ? "active" : ""}`}
                onClick={() => setActiveTab("executionPlan")}
              >
                Execution Plan
              </button>
            </li>
          </ul>

          {/* Tab content */}
          <div className="tab-content">
            {/* Query Results tab */}
            <div
              className={`tab-pane fade ${activeTab === "queryResults" ? "show active" : ""}`}
              id="queryResults"
            >
              <table className="table">
                <thead>
                  <tr>
                    {columns.map((column, index) => (
                      <th key={index}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentResults.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((column, columnIndex) => (
                        <td key={columnIndex}>{row[columnIndex]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <nav>
              <ul className="pagination justify-content-center">
  {/* First page */}
  <li className={`page-item ${currentPage === 1 ? 'active' : ''}`}>
    <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
  </li>

  {/* Ellipsis or second page */}
  {currentPage > 3 && (
    <li className="page-item">
      <button className="page-link" onClick={() => handlePageChange(currentPage - 2)}>...</button>
    </li>
  )}

  {/* Pages before the current page */}
  {currentPage > 1 && currentPage !== 2 && (
    <li className="page-item">
      <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>{currentPage - 1}</button>
    </li>
  )}

  {/* Current page */}
  {currentPage !== 1 && (
    <li className="page-item active">
      <button className="page-link" onClick={() => handlePageChange(currentPage)}>{currentPage}</button>
    </li>
  )}

  {/* Page after the current page */}
  {currentPage < Math.ceil(queryResults.length / resultsPerPage) && (
    <li className="page-item">
      <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>{currentPage + 1}</button>
    </li>
  )}

  {/* Ellipsis or second last page */}
  {currentPage < Math.ceil(queryResults.length / resultsPerPage) - 2 && (
    <li className="page-item">
      <button className="page-link" onClick={() => handlePageChange(currentPage + 2)}>...</button>
    </li>
  )}

  {/* Last page */}
  {currentPage < Math.ceil(queryResults.length / resultsPerPage) && (
    <li className={`page-item ${currentPage === Math.ceil(queryResults.length / resultsPerPage) ? 'active' : ''}`}>
      <button className="page-link" onClick={() => handlePageChange(Math.ceil(queryResults.length / resultsPerPage))}>
        {Math.ceil(queryResults.length / resultsPerPage)}
      </button>
    </li>
  )}
</ul>

        </nav>
            </div>

            {/* Execution Plan tab */}
            <div
              className={`tab-pane fade ${activeTab === "executionPlan" ? "show active" : ""}`}
              id="executionPlan"
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Operation</th>
                    <th>Name</th>
                    <th>Rows</th>
                    <th>Bytes</th>
                    <th>Cost</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {executionPlan.map((row, index) => (
                    <tr key={index}>
                      <td>{row.Id}</td>
                      <td>{row.Operation}</td>
                      <td>{row.Name}</td>
                      <td>{row.Rows}</td>
                      <td>{row.Bytes}</td>
                      <td>{row.Cost}</td>
                      <td>{row.Time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
