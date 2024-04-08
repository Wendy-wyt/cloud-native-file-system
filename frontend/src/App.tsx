import { nanoid } from 'nanoid';
import { UploadFileResponseDto } from './apis/uploadFile/interfaces';
import { uploadFile } from './apis/uploadFile/uploadFile';
import { insertFileData } from './apis/insertFileData/insertFileData';
import { useRef } from 'react';

function App() {
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('filename') as File;
    const id = nanoid();
    const input_text = formData.get('text') as string;
    uploadFile(file).then((res: UploadFileResponseDto) => {
      return insertFileData(id, input_text, res.s3Url);
    }).then(() => {
      alert('Data inserted successfully.');
    }).catch((err) => {
      alert(err);
    }).finally(() => {
      if (formRef.current) {
        formRef.current.reset();
      }
    });
  };

  return (
    <div className="App w-full h-full text-white bg-black flex items-center justify-center">
      <main className="size-fit">
        <h1 className="text-2xl font-semibold text-center mb-5">Append Text to File</h1>
        <div className='form'>
          <form onSubmit={onSubmit} ref={formRef} method="post" className="flex flex-col space-y-5 items-center">
            <div className="w-full">
              <label htmlFor="text" className="cursor-pointer">Text input: </label>
              <input type="text" name="text" id="text" className="block w-full border border-gray-300 bg-black rounded-lg cursor-pointer focus:outline-none px-2" />
            </div>
            <div>
              <label htmlFor="filename">File input (TXT only (MAX. 1MB).)</label>
              <input type="file" name="filename" id="filename" className="block w-full text-sm text-white border border-gray-300 rounded-lg cursor-pointer bg-black focus:outline-none" />
            </div>
            <div>
              <button type="submit" className="border border-gray-300 rounded-lg cursor-pointer focus:outline-none px-5 py-2">Submit</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
