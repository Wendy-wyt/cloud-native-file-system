import { API_ROUTE, API_URL } from '../../utils/constants';

export const insertFileData = async (id?: string, input_text?: string, input_file_path?: string) => {

    if (!id || !input_text || !input_file_path) {
        throw new Error('Invalid input data.');
    }

    if (!API_ROUTE || !API_URL) {
        throw new Error('Invalid API route or URL.');
    }

    const res = await fetch(API_URL + API_ROUTE, {
        method: 'POST',
        body: JSON.stringify({
            'id': id,
            'input_text': input_text,
            'input_file_path': input_file_path
        }),
        headers: {},
        mode: 'no-cors'
    });

    return res.text;
};