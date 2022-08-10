const http = require('http');
const path = require('path');
const fs = require('fs');

const host = 'localhost';
const port = 8000;

const default200 = 'Success';

const error400 = 'Неверный логин или пароль';
const error404 = 'Not found';
const error405 = 'HTTP method not allowed';

const error500 = 'Internal server error';

const filesDir = path.join(__dirname, 'files');

const user = {
    id: 123,
    username: 'testuser',
    password: 'qwerty'
};

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

                // для /delete и /post общая проверка на авторизацию
                case '/post':
                case '/delete': {
                    const headersCookie = request.headers?.cookie;
                    const cookieList = {};
                    headersCookie.split(';').forEach(cookie => {
                        const c = cookie.split('=');
                        cookieList[c[0].trim()] = decodeURIComponent(c[1].trim());
                    });

                    console.log(request.method, headersCookie, cookieList);
                    console.log(cookieList.userId, user.id, cookieList.authorized, true);

                    if (+cookieList.userId === user.id && cookieList.authorized === 'true') {
                        let data = '';

                        request.on('data', chunk => data += chunk);
                        request.on('end', () => {
                            const f = JSON.parse(data);
                            console.log(request.method, f);// filename content

                            const fullFileName = path.join(filesDir, f.filename);
                            if (request.method === 'POST') {
                                // создание файла                               
                                fs.appendFile(fullFileName, f.content, error => {
                                    if (error) {
                                        const txt = `File ${fullFileName} was not created, error = `;
                                        console.log(txt, error);
                                        writeResponse(520, txt + error);
                                    }
                                    else {
                                        const txt = `File ${fullFileName} was created`;
                                        console.log(txt);
                                        writeResponse(200, txt);
                                    }
                                });
                            }
                            else {
                                // удаление файла
                                fs.unlink(fullFileName, error => {
                                    if (error) {
                                        const txt = `File ${fullFileName} was not deleted, error = `;
                                        console.log(txt, error);
                                        writeResponse(521, txt + error);
                                    }
                                    else {
                                        const txt = `File ${fullFileName} was deleted`;
                                        console.log(txt);
                                        writeResponse(200, txt);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        writeResponse(400, error400);
                        break;
                    }
                }
            }
        }
    }
    // для /redirect ответ о постоянном размещении ресурса по новому адресу
    else if (request.url === '/redirect' && request.method === 'GET') {
        response.writeHead(301, { 'Location': `http://${host}:${port}/redirected` });
        response.end();
    }
    else if (request.url === '/auth') {
        if (request.method === 'POST') {

            let data = '';
            request.on('data', chunk => data += chunk);
            request.on('end', () => {
                const u = JSON.parse(data);
                console.log('auth ', u);

                if (user.username.toUpperCase() === u.username.toUpperCase() && user.password === u.password) {
                    const maxAge = 60 * 60 * 24 * 2;
                    response.writeHead(200,
                        {
                            'Set-Cookie': [`userId=${user.id}; max-age=${maxAge}; path=/`,
                            `authorized=true; max-age=${maxAge}; path=/`]
                        });
                    response.end('Auth success');
                }
                else
                    writeResponse(400, error400);
            })


        }
        else
            writeResponse(405, error405);
    }
    else
        writeResponse(404, error404);
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
