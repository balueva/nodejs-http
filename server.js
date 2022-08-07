const http = require('http');
const path = require('path');
const fs = require('fs');

const host = 'localhost';
const port = 8000;

const default200 = 'Success';

const error404 = 'Not found';
const error405 = 'HTTP method not allowed';

const error500 = 'Internal server error';

const filesDir = path.join(__dirname, 'files');

const checkMethod = (url, method) => {
    const m = url.replace(/^\//, '').toUpperCase();
    return m === method;
}

const requestListener = (request, response) => {

    const writeResponse = (code, content) => {
        response.writeHead(code);
        response.end(content);
    };

    if (request.url === '/get' || request.url === '/delete' || request.url === '/post') {
        // для ендпоинтов /get, /delete, /post проверка, 
        // чтобы наименование метода совпадало с наименованием ендпоинта
        // если не совпадает - ошибка
        if (!checkMethod(request.url, request.method))
            writeResponse(405, error405);
        else {
            switch (request.url) {
                // для /get выводим список файлов их директории files
                case '/get': {
                    try {
                        const files = fs.readdirSync(filesDir).join(', ');
                        writeResponse(200, files);
                    }
                    catch {
                        writeResponse(500, error500);
                    }
                    break;
                }
                // для /delete и /post вывод одной и той же строки
                case '/delete', '/post': {
                    writeResponse(200, default200);
                    break;
                }
            }
        }
    }
    // для /redirect ответ о постоянном размещении ресурса по новому адресу
    else if (request.url === '/redirect' && request.method === 'GET') {
        response.writeHead(301, { 'Location': `http://${host}:${port}/redirected` });
        response.end();
    }
    else
        writeResponse(404, error404);
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
