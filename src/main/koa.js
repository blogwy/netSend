/*
 * @Author: xiaobei
 * @Date: 2021-01-29 15:43:57
 * @LastEditTime: 2023-03-20 21:30:34
 * @LastEditors: xiaobei
 */
import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from 'koa-body';
import KoaRange from 'koa-range';
import fs from 'fs'
import path from 'path'
import DB from './db';
import { uploadFilePublic, getTxt, addTxt } from './service'


const app = new Koa();
const router = new Router();
const db = new DB()

const isDev = process.env.NODE_ENV === 'development';

const parseRange = (range, size) => {
    if (range) {
        const [start, end] = range.replace('bytes=', '').split('-')
        return { start: +start, end: end && end <= size ? end : size }
    } else {
        return { start: 0, end: size }
    }
}

let serverStatus

router.get('/file/:id/:name', async (ctx, next) => {
    const { id } = ctx.params;
    // 拿到文件名，检查文件是否存在，存在则返回文件流，不存在404
    const file = await db.findById(id)
    if (file) {
        try {
            ctx.body = fs.createReadStream(file.path);
        } catch (error) {
            console.log('error', error);
            ctx.status = 404
            ctx.body = '文件不存在'
        }
    } else {
        ctx.status = 404
        ctx.body = '文件不存在'
    }
});

router.get('/api/getList', async (ctx, next) => {
    ctx.body = await db.getList();
})

router.delete('/api/deleteFile/:id', async (ctx, next) => {
    const { id } = ctx.params;
    ctx.body = await db.deleteById(id);
})

router.post('/api/createFile', async (ctx, next) => {
    const body = ctx.request.body || {};
    const res = await db.create(body);
    ctx.body = res
})

router.post('/api/uploadFile', async (ctx, next) => {
    const { file } = ctx.request.files;
    const fileArrs = file.length ? file : [file];
    uploadFilePublic(ctx, fileArrs);
})



router.post('/api/addTxt', async (ctx, next) => {
    const { txt } = ctx.request.body || {};
    addTxt(ctx, txt)

})

router.get('/api/getTxt', async (ctx, next) => {
    getTxt(ctx)
})

router.get('/help', async (ctx, next) => {
    if (isDev) {
        ctx.redirect('http://localhost:8011/#/upload')
    } else {
        ctx.type = 'text/html'
        ctx.body = fs.createReadStream(path.join(__dirname, "./index.html"))
    }
})

router.get('/umi.js', async (ctx, next) => {
    ctx.type = 'text/js'
    ctx.body = fs.createReadStream(path.join(__dirname, "./umi.js"))
})
router.get('/umi.css', async (ctx, next) => {
    ctx.type = 'text/css'
    ctx.body = fs.createReadStream(path.join(__dirname, "./umi.css"))
})




app
    .use(cors({ exposeHeaders: '*', }))
    .use(bodyParser({
        multipart: true, // 支持文件上传
        formidable: {
            maxFieldsSize: 2 * 1024 * 1024, // 最大文件为2兆
        }
    }))
    .use(router.routes())
    .use(router.allowedMethods())
    .use(KoaRange);

const startServer = async (port) => {
    if (!serverStatus) {
        app.listen(port, '0.0.0.0', () => {
            serverStatus = true
            console.log(`server start success port: ${port} `);
        })
    }
}

export default startServer
