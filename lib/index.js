// Packages
const Router = require('router')
const finalhandler = require('finalhandler')
// const ExpressGoogleAnalytics = require('express-google-analytics');
const GoogleUniversalAnalytics = require('universal-analytics');
const Cache = require('./cache')

// Analytics.
// const analytics = ExpressGoogleAnalytics(process.env.GA_TRACKING_ID);
const fetch = require('node-fetch')

const telemetryLog = async (source, event, args) => {
  const baseUrl = `https://dappnet-telemetry.vercel.app/api/v1/events`
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source,
      event,
      args
    }),
  })
}

const gaMiddleware = function (googleAnalyticsId) {
  return async (request, response, next) => {
    // const visitor = GoogleUniversalAnalytics(googleAnalyticsId)
    
    await telemetryLog('update-server', 'pageview', {
      path: request.url,
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
    })

    next();

    // visitor.pageview({
    //   dp: request.url,
    //   dh: request.headers.host,
    //   uip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
    //   ua: request.headers['user-agent'],
    //   dr: request.headers.referrer || request.headers.referer,
    //   de: request.headers['accept-encoding'],
    //   ul: request.headers['accept-language']
    // }, function (err) {
    //   console.log(1)
    //   if(err) console.error("GA - error: " + err)

    //   next();
    // })

  }
};



module.exports = config => {
  const router = Router()
  let cache = null;

  try {
    cache = new Cache(config)
  } catch (err) {
    const { code, message } = err

    if (code) {
      return (req, res) => {
        res.statusCode = 400;

        res.end(JSON.stringify({
          error: {
            code,
            message
          }
        }))
      }
    }

    throw err
  }

  const routes = require('./routes')({ cache, config })

  router.use(gaMiddleware(process.env.GA_TRACKING_ID))

  // Define a route for every relevant path
  router.get('/', routes.overview)
  router.get('/latest/mac/pkg', routes.latestMacPkg)
  router.get('/download', routes.download)
  router.get('/download/:platform', routes.downloadPlatform)
  router.get('/update/:platform/:version', routes.update)
  router.get('/update/win32/:version/RELEASES', routes.releases)

  return (req, res) => {
    router(req, res, finalhandler(req, res))
  }
}
