const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');

dotenv.config();

const indexRouter = require('./routes');
const receiveRouter = require('./routes/receiveRouter');

const app = express();
const server = require('http').createServer(app);
app.set('port', process.env.PORT || 8088);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const corsOptions = {
    origin: process.env.CORS || 'http://127.0.0.1:3000',
    credentials: true,
};

app.use(cors(corsOptions));

// app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
    session({
        resave: false,
        saveUninitialized: false,
        secret: process.env.COOKIE_SECRET,
        cookie: {
            httpOnly: true,
            secure: false,
        },
    })
);

app.use('/', indexRouter);
app.use('/receive', receiveRouter);

// 404 응답 미들웨어
app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

// 에러 처리 미들웨어
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

server.listen(app.get('port'), () => {
    // eslint-disable-next-line no-console
    console.log(app.get('port'), '번 포트에서 대기 중');
});
