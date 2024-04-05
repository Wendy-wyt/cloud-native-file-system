import './App.css';

function App() {

  const formData = new FormData();

  return (
    <div className="App">
      <main>
        <h1>Append Text to File</h1>
        <div className='form'>
          <form action="" method="post">
            <label htmlFor="text">Text input: </label>
            <input type="text" name="text" id="text" />
            <br />
            <label htmlFor="filename">File input: </label>
            <input type="file" name="filename" id="filename" />
            <br />
            <button type="submit">Submit</button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
