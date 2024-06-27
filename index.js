
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config()

const PORT = 8080

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Set up Shopify API Credentials
// const shopify_api_base_url = process.env.EIGHTHUNDRED_SHOPIFY_API_BASE_URL
// const shopify_api_key = process.env.EIGHTHUNDRED_SHOPIFY_API_KEY
// const shopify_api_secret_key = process.env.EIGHTHUNDRED_SHOPIFY_API_SECRET_KEY
// const shopify_admin_api_access_token = process.env.EIGHTHUNDRED_SHOPIFY_ADMIN_API_ACCESS_TOKEN
// const shopify_storefront_api_access_token = process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN

// 
const shopify_api_base_url = process.env.SHOPIFY_API_BASE_URL
const shopify_api_key = process.env.SHOPIFY_API_KEY
const shopify_api_secret_key = process.env.SHOPIFY_API_SECRET_KEY
const shopify_admin_api_access_token = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN
const shopify_storefront_api_access_token = process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN


app.get('/api', (req, res) => {
    res.json({ 
        message: 'hi from the server!'
    })
})

app.post('/shopify/blogs/get-all-blogs', (req, res) => {
    console.log('okayyy')
    fetch(shopify_api_base_url + '/blogs.json', {
        method: 'GET',
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shopify_admin_api_access_token
        }
    })
    .then(res => res.json())
    .then(data => {
        res.send({
            "message": "success",
            "blogs": data.blogs
        })
    })
    .catch(err => {
        res.send({
            "message": "error",
            "error": err
        })
    })
})

function waitforme(millisec) {
    return new Promise(resolve => {
        console.log("Waiting to upload the next post so we don't upset Shopify...")
        setTimeout(() => { resolve('') }, millisec)
    })
}

async function createNewPost(article, id, index, totalArticles) {
    let count = index + 1
    const response = await fetch(shopify_api_base_url + '/blogs/' + id + '/articles.json', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shopify_admin_api_access_token
        },
        body: JSON.stringify(article) 
    })
    const json = await response.json()
    console.log("==============================================================")
    console.log(json.article.title)
    console.log("Article " + count + " of " + totalArticles + " created.")
    console.log("==============================================================")
}

app.post('/shopify/blogs/create-article', async (req, res) => {
    if (req.headers.api_key !== process.env.API_KEY) {
        res.send({ "status": 403, "message" : "Nope" })
        return
    } else {
        let newArticle
        let blogId = req.body.blog.id
        let numberOfArticles = req.body.articles.length - 1 
        console.log(req.body.articles)
        console.log("number of articles to upload: " + numberOfArticles)
        for (let i = 0; i < req.body.articles.length; i++) {
            newArticle = {
                "article": {
                    "title" : req.body.articles[i].title,
                    "author" : req.body.articles[i].author,
                    "body_html" : req.body.articles[i].body_html,
                    "published": false,
                    "excerpt": req.body.articles[i].excerpt,
                    "image": {
                        "src": req.body.articles[i].image.src,
                    },
                    "tags": req.body.articles[i].tags,
                    "handle": req.body.articles[i].slug
                }
            }
            try {
                await createNewPost(newArticle, blogId, i, req.body.articles.length)
                await waitforme(1000)
                if (i === numberOfArticles) {
                    res.send({ message: "all done!" })
                }
            } catch (error) {
                res.send({ error: error })
            }
        }
    }

})

app.post('/shopify/blogs/get-articles', async (req, res) => {
    const response = await fetch(shopify_api_base_url + '/blogs/' + id + '/articles.json', {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shopify_admin_api_access_token
        }
    })
    const json = response.json()
    console.log(json)
})

async function getWordpressAuthor(url, id) {
    const response = await fetch(`${url}/wp-json/wp/v2/users/` + id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    })
    const json = await response.json()
    return json
}

async function getWordpressTag(url, id) {
    const response = await fetch(`${url}/wp-json/wp/v2/tags/` + id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    })
    const json = await response.json()
    return json.name
}

async function getWordpressMedia(url, id) {
    const response = await fetch(`${url}/wp-json/wp/v2/media/` + id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    })
    const json = await response.json()
    return json
}

app.post('/wordpress/blogs/get-all-posts', async (req, res) => {
    console.log('lets do it!')
    if (req.headers.api_key !== process.env.API_KEY) {
        res.send({ "status": 403, "message" : "Nope" })
        return
    } else {
        let posts = []
        let url = req.body.url
        const response = await fetch(`${url}/wp-json/wp/v2/posts?per_page=5`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        })
        const json = await response.json()
        for (let i = 0; i < json.length; i++) {
            console.log("Here's a post!")
            const author = await getWordpressAuthor(url, json[i].author)
            let tags = []
            for (let j = 0; j < json[i].tags.length; j++) {
                const tag = await getWordpressTag(url, json[i].tags[j])
                tags.push(tag)
            }
            const featuredImage = await getWordpressMedia(url, json[i].featured_media)
            let post = {
                "title": json[i].title.rendered,
                "date": json[i].date,
                "author": author.name,
                "body_html": json[i].content.rendered,
                "published": false,
                "excerpt": json[i].excerpt.rendered,
                "image": {
                    "src": featuredImage.source_url,
                },
                "tags": tags.join(', ')
            }
            posts.push(post)
            if (i === json.length - 1) {
                res.send({ 
                    status: 200,
                    message: "all done!", 
                    posts: posts
                })
            }
        }
    }
})

app.listen(PORT, () => {
    console.log(`server up and running on port ${PORT}`)
})


export const handler = app;