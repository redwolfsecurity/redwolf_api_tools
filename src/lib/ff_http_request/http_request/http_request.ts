// Commented out by Alex Bath until whatwg-url can be replaced with browser compatible npm

// Fancy HTTP Library
// import {Observable} from 'rxjs';
// import axios, {AxiosPromise, AxiosRequestConfig, CancelTokenSource} from 'axios';
// import {AxiosObservable} from './axios/axios_observable.interface';


import * as axios from 'axios'
// import * as http_curl_request from './curl/http_curl_request'

import * as parseURL from 'url-parse';
// import { parse, stringify } from 'query-string';
import { parse, stringify } from 'qs';
import { httpsOverHttp } from 'tunnel';


// Make XMLHttpRequests from the browser
// Make http requests from node.js
// Supports the Observable API
// Intercept request and response
// Transform request and response data
// (NEW in v1.1.0) Cancel requests through unsubscribe
// Automatic transforms for JSON data
// Client side support for protecting against XSRF



/*
  http_request ( data, options, scope )

  Data Examples:
  =============
  You can pass in an object, or an array of objects.

  // Simplest Usage
  { url: 'https://localhost/' }



  // With Crednetials
  { url: 'https://somecontrol.com/query?mime_type=x/y&$sort:timestamp_epoch_ms=-1$limit=3',
    credentials : {
       username : "a_username",
       password : "a_password"
    }
  }

  // No URL lets you specify the individual parameters
  { protocol : 'https',     // If you specify http, default port is 80 If you specify https, default port is 443
    host: 'somecontrol.com',     // host can be a hostname or host. Alternately you could include fqdn
    port: 443,            // Optional, will default to 80 or 443 if protocol is specified. Else defaults to 443 and https.
    path: '/query',        // Optional, defaults to /
    parameters : {
       mime_type : 'x/y',
       "$sort:timestamp_epoch_ms" : -1,
       "$limit" : 3
    },
    credentials : {
       username : "a_username",
       password : "some_password"
    }
  }

  // Specify a proxy
  { url: 'https://localhost/',
    proxy: {
      host: '127.0.0.1',
      port: 9000,
      auth: {   // Just basic HTTP Authentication is supported.
                // This will set Proxy-Authorization. Use custom headers if you need a special header.
        username: 'proxy_user',
        password: 'proxy_pass'
      }
    }
  }

  Options Examples:
  ================
  None Currently

  Scope Examples:
  ==============
  You can pass in an Axios that might be pre-created (e.g. for HTTP Keep-Alive) as follows:
  {
      mime_type: "axios/instance",
      instance : <pointer to Axios Instance Object>
  }

*/
export async function http_request(data, options?, scope?) {
    // Handle 1 or n requests by passing in [ {r1} , {r2} ... ]

    if (data && data[Symbol.iterator] && typeof data !== 'string') {
        return Promise.all(data.map(request => http_request(request, options, scope)));
    }

    let axios_instance; // this will hold the actual flavour of axios.
    // We can create persistent axios's and pass them through scope if we want
    const axios_request = {} as any; // this is the axios request we will build from our input data
    let axios_result; // this will be the result from the call to axios, which we must normalize and output
    let output; // this is what we return

    // Check scope to see if we already have an axios agent to use
    // Find the first Axios agent if we can find one
    if (scope && scope[Symbol.iterator] && typeof data !== 'string') {
        const potential_instance = scope.find((item) => { return item['mime_type'] === 'axios/instance'; });
        if (potential_instance) {
            if (potential_instance['instance']) {
                axios_instance = potential_instance['instance'];
            }
        }
    }
    if (!axios_instance) {
        // None found. Create one
        axios_instance = axios;
    }

    // Let's build an axios request! One bit at a time!
    // Build URL from what is in data

    /*
      Examples:
      ========
      { url: 'https://somecontrol.com/query?mime_type=x/y&$sort:timestamp_epoch_ms=-1$limit=3',
        credentials : {
           username : "a_username",
           password : "a_password"
        }
      }

      { protocol : 'https',
        fqdn: 'somecontrol.com',
        path: '/query',
        parameters : {
           mime_type : 'x/y',
           "$sort:timestamp_epoch_ms" : -1,
           "$limit" : 3
        },
        credentials : {
           username : "a_username",
           password : "a_password"
        }
      }
    */

    let url;
    if (data.url) {
        url = data.url;
    }


    /*
    "  https:   //  user : pass @ sub.host.com : 80   /p/a/t/h  ?  query=string   #hash "
    │          │  │      │      │   hostname   │port│          │                │       │
    │          │  │ user-│ pass-├──────────────┴────┤          │                │       │
    │ protocol │  │ name │ word │        host       │          │                │       │
    ├──────────┴──┼──────┴──────┼───────────────────┤          │                │       │
    │   origin    │             │       origin      │ pathname │     search     │ hash  │
    ├─────────────┴─────────────┴───────────────────┴──────────┴────────────────┴───────┤
    │                                    href                                           │
    └───────────────────────────────────────────────────────────────────────────────────┘

        Consider this URL: 'https://user:password@site.co.uk/path1/path2?a=b#my_hash'

        Given parsed URL, WHATWG parseURL( url ) from above, gives

        NODE gives us:
            {
            scheme: 'https',
            username: 'user',
            password: 'password',
            host: 'site.co.uk',
            port: null,
            path: [ 'path1', 'path2' ],
            query: 'a=b',
            fragment: 'my_hash',
            cannotBeABaseURL: false
            }

        BROWSER CONSOLE new URL( url ), for above, gives us:
            {
            username: "user",
            password: "password"
            hash: "my_hash"
            host: "site.co.uk"
            hostname: "site.co.uk"
            href: "https://user:password@site.co.uk/path1/path2?a=b"
            origin: "https://site.co.uk"
            pathname: "/path1/path2"
            port: "" <--- note port should be specified
            protocol: "https:"
            search: "?a=b"
            searchParams: URLSearchParams {}

    */

    if (data['url']) {
        // TODO: This isn't enough, there are far more protocols than just http or https. This won't work on any other protocol.
        if (data['url'].indexOf('http') !== 0) {
            // No protocol, assume https
            data['url'] = 'https://' + data['url']
        }

        const parsed_url = parseURL(data['url']); // parseURL( input, options ); options are { baseUrl, encodingOverride }

        if (parsed_url['protocol']) {
            const colon_index = parsed_url['protocol'].indexOf(':');
            if (colon_index !== -1) {
                parsed_url['protocol'] = parsed_url['protocol'].substr(0, colon_index)
            }
            axios_request['protocol'] = parsed_url['protocol'];
        }

        if (parsed_url['scheme']) {
            axios_request['protocol'] = parsed_url['scheme'];
        }

        if (parsed_url['host']) {
            axios_request['host'] = parsed_url['host'];
        }

        if (parsed_url['path']) {
            axios_request['path'] = '/' + parsed_url['path'].join('/');
        }

        if (parsed_url['pathname']) {
            axios_request['path'] = parsed_url['pathname']
        }

        if (parsed_url['port']) {
            axios_request['port'] = parsed_url['port'];
        }

        if (parsed_url['query']) {
            // NOTE : Params may actually be duplicated on URL.
            // ie. a=1&a=2 is a string here, but Axios doesn't handle this case if we use 'params'
            // So for now we just don't set PARAMS
            // WHATWG parser correctly gives the query string in the best way
            // axios_request['params'] = query_string.parse( parsed_url['query'] )
            parsed_url['query'] = parsed_url['query'].substr(1, parsed_url['query'])
            axios_request['query_string'] = parsed_url['query'];
            // Remove ? from beginning of query returned from parse-url package
            axios_request['params'] = parse(parsed_url['query']);

        }

    } // End of Parsed URL


    // Ensure we have a protocol. Explicit protocol overrides what is in URL. Default is https.
    if (data['protocol']) {
        axios_request['protocol'] = data['protocol'];
    }
    if (!axios_request['protocol']) {
        axios_request['protocol'] = 'https';
    }

    // Ensure we have a port. Explicit port overrides what is in URL
    if (data['port']) {
        // tslint:disable-next-line: radix
        axios_request['port'] = parseInt(data['port']);
    }

    if (!axios_request['port']) {
        if (axios_request['protocol'] === 'http') {
            axios_request['port'] = 80;
        } else {
            axios_request['port'] = 443;
        }
    }

    // Ensure we have a host. Explicit host overrides what is in URL. Default is localhost.
    if (data['host']) {
        axios_request['host'] = data['host'];
    }
    if (!axios_request['host']) {
        axios_request['host'] = 'localhost';
    }

    // Ensure method. Default is GET
    if (data['method']) {
        axios_request['method'] = data['method'];
    }
    if (!axios_request['method']) {
        axios_request['method'] = 'GET';
    }

    // Ensure path. Explicit path overrides what is in URL.
    if (data['path']) {
        axios_request['path'] = data['path'];
    }
    if (!axios_request['path']) {
        axios_request['path'] = '/';
    }
    if (axios_request['path'][0] !== '/') {
        axios_request['path'] = '/' + axios_request['path']; // ensures paths start with a /
    }

    // Ensure path starts with a '/'

    // TODO Consider if this makes sense to expose
    // `baseURL` will be prepended to `url` unless `url` is absolute.
    // It can be convenient to set `baseURL` for an instance of axios to pass relative URLs
    // to methods of that instance.
    // baseURL: 'https://some-domain.com/api/',

    // TODO Incorporate as part of general transoformation middleware
    // `transformRequest` allows changes to the request data before it is sent to the server
    // This is only applicable for request methods 'PUT', 'POST', 'PATCH' and 'DELETE'
    // The last function in the array must return a string or an instance of Buffer, ArrayBuffer,
    // FormData or Stream
    // You may modify the headers object.
    // transformRequest: [function (data, headers) {
    // // Do whatever you want to transform the data
    // return data;
    // }],

    // TODO Incorporate as general transformation middleware
    // `transformResponse` allows changes to the response data to be made before
    // it is passed to then/catch
    // transformResponse: [function (data) {
    // // Do whatever you want to transform the data
    // return data;
    // }],


    // `params` are the URL parameters to be sent with the request
    // Must be a plain object or a URLSearchParams object
    // params: {
    // ID: 12345
    // },

    // `headers` are custom headers to be sent
    // headers: {'X-Requested-With': 'XMLHttpRequest'},

    if (data['headers']) {
        axios_request['headers'] = data['headers'];
    }

    // Parameters
    // URL may specify parameters. Explicit parameters override what is on URL'
    if (data['parameters']) {
        axios_request['params'] = {
            ...axios_request['params'],
            ...data['parameters']
        };
    }


    // `paramsSerializer` is an optional function in charge of serializing `params`
    // (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
    // paramsSerializer: function (params) {
    // return stringify(params, {arrayFormat: 'brackets'})
    // },


    // `data` is the data to be sent as the request body
    // Only applicable for request methods 'PUT', 'POST', and 'PATCH'
    // When no `transformRequest` is set, must be of one of the following types:
    // - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
    // - Browser only: FormData, File, Blob
    // - Node only: Stream, Buffer
    // data: {
    // firstName: 'Fred'
    // },

    // Request data if supplied
    // TODO this is one of two ways of doing data
    // TODO add file upload style as well for multi-part MIME uploads
    if (data['data']) {
        axios_request['data'] = data['data'];
    }

    // Ensure Timeout
    // `timeout` specifies the number of milliseconds before the request times out.
    // If the request takes longer than `timeout`, the request will be aborted.
    // timeout: 1000, // default is `0` (no timeout)
    if (data.timeout_ms) { axios_request.timeout = data.timeout_ms; }
    if (data.timeout_s) { axios_request.timeout = data.timeout_s * 1000; }
    if (!axios_request['timeout']) {
        axios_request['timeout'] = 10000;  // Default 10 seccond timeout folks! Design systems to be responsive!
    }

    // TODO Research what this option does and decide what to do on it
    // `withCredentials` indicates whether or not cross-site Access-Control requests
    // should be made using credentials
    // withCredentials: false, // default


    // TODO Support an adapter or mock system for testing
    // `adapter` allows custom handling of requests which makes testing easier.
    // Return a promise and supply a valid response (see lib/adapters/README.md).
    // adapter: function (config) {
    // /* ... */
    // },


    // `auth` indicates that HTTP Basic auth should be used, and supplies credentials.
    // This will set an `Authorization` header, overwriting any existing
    // `Authorization` custom headers you have set using `headers`.
    // Please note that only HTTP Basic auth is configurable through this parameter.
    // For Bearer tokens and such, use `Authorization` custom headers instead.
    // auth: {
    // username: 'janedoe',
    // password: 's00pers3cret'
    // },
    // ff credentials include username and password
    // TODO do error checking on these (presence and limits)
    if (data.credentials) {
        axios_request.auth = {
            username: data.credentials.username,
            password: data.credentials.password
        };
    }

    // TODO Support different response types
    // `responseType` indicates the type of data that the server will respond with
    // options are: 'arraybuffer', 'document', 'json', 'text', 'stream'
    //   browser only: 'blob'
    // responseType: 'json', // default

    // TODO Support different response encodings.
    // `responseEncoding` indicates encoding to use for decoding responses
    // Note: Ignored for `responseType` of 'stream' or client-side requests
    // responseEncoding: 'utf8', // default

    // TODO Add cross site scripting cookies
    // `xsrfCookieName` is the name of the cookie to use as a value for xsrf token
    // xsrfCookieName: 'XSRF-TOKEN', // default

    // TODO Add cross site scripting tokens
    // `xsrfHeaderName` is the name of the http header that carries the xsrf token value
    // xsrfHeaderName: 'X-XSRF-TOKEN', // default

    // TODO observable progress for uploads
    // `onUploadProgress` allows handling of progress events for uploads
    // onUploadProgress: function (progressEvent) {
    // // Do whatever you want with the native progress event
    // },

    // TODO observable progress for downloads
    // `onDownloadProgress` allows handling of progress events for downloads
    // onDownloadProgress: function (progressEvent) {
    // // Do whatever you want with the native progress event
    // },

    // `maxContentLength` defines the max size of the http response content in bytes allowed
    // maxContentLength: 2000,
    if (data['content_length_bytes_max']) {
        // tslint:disable-next-line: radix
        const content_length_bytes_max = parseInt(data['content_length_max_bytes']);
        if (content_length_bytes_max) { axios_request['maxContentLength'] = parseInt; }
    }

    // If no content length, set it to 100 megabytes
    if (!axios_request['maxContentLength']) {
        axios_request['maxContentLength'] = 1024 * 1024 * 100; // 100 megabytes max is the default
    }

    // TODO Add pipeline of validation
    // `validateStatus` defines whether to resolve or reject the promise for a given
    // HTTP response status code. If `validateStatus` returns `true` (or is set to `null`
    // or `undefined`), the promise will be resolved; otherwise, the promise will be
    // rejected.
    // validateStatus: function (status) {
    // return status >= 200 && status < 300; // default
    // },

    // TODO Better handling of max_redirects in option
    // `maxRedirects` defines the maximum number of redirects to follow in node.js.
    // If set to 0, no redirects will be followed.
    // maxRedirects: 5, // default

    // TODO Support socket with some docker examples
    // `socketPath` defines a UNIX Socket to be used in node.js.
    // e.g. '/var/run/docker.sock' to send requests to the docker daemon.
    // Only either `socketPath` or `proxy` can be specified.
    // If both are specified, `socketPath` is used.
    // socketPath: null, // default

    // TODO Support creation of persistent agents
    // `httpAgent` and `httpsAgent` define a custom agent to be used when performing http
    // and https requests, respectively, in node.js. This allows options to be added like
    // `keepAlive` that are not enabled by default.
    // httpAgent: new http.Agent({ keepAlive: true }),
    // httpsAgent: new https.Agent({ keepAlive: true }),

    // 'proxy' defines the hostname and port of the proxy server.
    // You can also define your proxy using the conventional `http_proxy` and
    // `https_proxy` environment variables. If you are using environment variables
    // for your proxy configuration, you can also define a `no_proxy` environment
    // variable as a comma-separated list of domains that should not be proxied.
    // Use `false` to disable proxies, ignoring environment variables.
    // `auth` indicates that HTTP Basic auth should be used to connect to the proxy, and
    // supplies credentials.
    // This will set an `Proxy-Authorization` header, overwriting any existing
    // `Proxy-Authorization` custom headers you have set using `headers`.
    // proxy: {
    // host: '127.0.0.1',
    // port: 9000,
    // auth: {
    // username: 'mikeymike',
    // password: 'rapunz3l'
    // }
    // },
    // TODO Improve error checking
    if (data['proxy']) {
        // We need to supply our https agent that will tunnel over http for proxy cases
        axios_request['proxy'] = false;
        axios_request['httpsAgent'] = httpsOverHttp({
            proxy: {
                host: data['proxy']['host'],
                port: data['proxy']['port'],
            }
        });
        axios_request['proxy'] = data['proxy'];
    }

    // TODO
    // `cancelToken` specifies a cancel token that can be used to cancel the request
    // (see Cancellation section below for details)
    // cancelToken: new CancelToken(function (cancel) {
    // })

    // TODO Support regular form posts in a fancy way
    // syntax alternative to send data into the body
    // method post
    // only the value is sent, not the key
    // data: 'Country=Brasil&City=Belo Horizonte',

    // Create a URL
    axios_request['url'] = `${axios_request['protocol']}://${axios_request['host']}${axios_request['path']}`;

    // If we have parameters, let's pop them on the end
    // if ( axios_request['params'] ) {
    // axios_request['url'] += '?' + query_string.stringify( axios_request['params'] )
    // }


    output = {
        mime_type: 'http/response',
        request: data, // The request we sent in
        actual_request: { // The actual request we are making
            mime_type: 'axios/request',
            request: axios_request
        },
        start_time_epoch_ms: Date.now(),
    };

    //////////////////////////////////////////////////////////////////////////////
    // It's REQUEST Time! YAY!
    try {
        axios_result = await axios_instance.request(axios_request);
        // `data` is the response that was provided by the server
        if (axios_result['data']) {
            output['data'] = axios_result['data'];
        }

        // `status` is the HTTP status code from the server response
        //  status: 200,
        // Fancy field is http_code
        if (axios_result['status']) {
            // tslint:disable-next-line: radix
            output['http_code'] = parseInt(axios_result['status']);
        }

        // `statusText` is the HTTP status message from the server response
        // statusText: 'OK',
        if (axios_result['statusText']) {
            // Attribute for native event messages is event_message_native
            output['event_message_native'] = axios_result['statusText'];
        }

        // `headers` the headers that the server responded with
        // All header names are lower cased
        // headers: {},
        if (axios_result['headers']) {
            output['headers'] = axios_result['headers'];
        }

        // `config` is the config that was provided to `axios` for the request
        // config: {},
        // if ( axios_result['config'] )
        // {
        // }

        // `request` is the request that generated this response
        // It is the last ClientRequest instance in node.js (in redirects)
        // and an XMLHttpRequest instance the browser
        // request: {}
        // if ( axios_result['config'] )
        // {
        // }

    } catch (error) {
        // Axios throws an error if it is not a 200 response,
        // OR if it can't resolve, OR connect, OR perhaps did not get a response, OR ... for numerous reasons.
        // Any subsystem Axios uses might throw an error which winds up here.

        // But we know there is an error at least
        output['is_error'] = true;

        // If this happens to be a Javascript Error it should have name and mesage
        if (error['name']) {
            output['event_code_native'] = error['name'];
        }

        // If we have a Javascript Error, we _might_ get a 'message'
        if (error['message']) {
            output['event_message_native'] = error['message'];
        }

        // The request was made and the server responded with a status code
        if (error['response']) {
            const response = error['response'];

            if (response['data']) {
                output['data'] = response['data'];
            }

            if (response['status']) {
                // tslint:disable-next-line: radix
                output['http_code'] = parseInt(response['status']);
            }

            if (response['statusText']) {
                output['event_message_native'] = response['statusText'];
            }

            if (response['headers']) {
                output['headers'] = response['headers'];
            }

        }
    }

   /*
    This is from libcurl tool I wrote for waf monitoring
            var output = {
              mime_type : 'http/response',
              curl_version :                  curl.libcurl.getVersion(),
              // protocol :                      curl_info.PROTOCOL,
              // effective_url :                 curl_info.EFFECTIVE_URL,
              url :                           curl_info.URL,
              scheme :                        curl_info.SCHEME,
              primary_ip :                    curl_info.PRIMARY_IP,
              primary_port :                  curl_info.PRIMARY_PORT,
              local_ip :                      curl_info.LOCAL_IP,
              local_port :                    curl_info.LOCAL_PORT,
              cookie_list :                   curl_info.COOKIELIST,
              dns_lookup_time_ms :            Math.floor(curl_info.NAMELOOKUP_TIME * 1000),
              http_response_code :            curl_info.RESPONSE_CODE,
              http_protocol_version :         curl_info.HTTP_VERSION,
              // These seem to not work:
              //tls_handshake_time_ms :       Math.floor(curl_info.APPCONNECT_TIME * 1000),
              // validate_ssl_certificates:   curl_info.SSL_VERIFYRESULT == 1 ? true : false,
              //tls_certificate_info :        curl_info.CERTINFO,
              //tls_ssl_engines :             curl_info.SSL_ENGINES,
              pre_transfer_time_ms :          Math.floor(curl_info.PRETRANSFER_TIME * 1000),
              time_to_first_byte_ms :         Math.floor(curl_info.STARTTRANSFER_TIME * 1000),
              time_spent_in_redirects_ms :    Math.floor(curl_info.REDIRECT_TIME * 1000),
              redirect_count :                curl_info.REDIRECT_COUNT,
              redirect_url :                  curl_info.REDIRECT_URL,
              request_size_bytes :            curl_info.REQUEST_SIZE,
              upload_size_bytes :             curl_info.SIZE_UPLOAD,
              response_size_bytes :           curl_info.SIZE_DOWNLOAD,
              response_reported_by_content_length_header: curl_info.CONTENT_LENGTH_DOWNLOAD,
              response_content_type :         curl_info.CONTENT_TYPE,
              upload_speed_bytes_per_second : curl_info.SPEED_UPLOAD,
              header_size_bytes :             curl_info.HEADER_SIZE,
              curl_error_code:                curl_info.OS_ERRNO,
              status_code :                   statusCode,
              response_headers :              headers,
              response_body :                 body,
              response_body_length_bytes :    body.length,
              time_total_ms :                 Math.floor(curl_info.TOTAL_TIME * 1000),
            }
    */

    // How long did it take?
    output['end_time_epoch_ms'] = Date.now();
    output['elapsed_ms'] = output['end_time_epoch_ms'] - output['start_time_epoch_ms'];

    return output;
}

