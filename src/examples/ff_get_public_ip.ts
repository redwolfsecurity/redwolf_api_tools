// This will get your public IP

import { http_request as ff_http_request } from '../lib/ff_http_request'

/*
Output will be like:

{
  requestor_ip: '72.12.177.102',
  geo: {
    range: [ 1208778752, 1208795135 ],
    country: 'CA',
    region: 'ON',
    city: 'Hamilton',
    ll: [ 43.241, -79.8452 ],
    metro: 0
  }
}

Or an error, dumping the whole request.

*/


const portal_hostname = 'mastercontrol.redwolfsecurity.com'

async function main () {

	const request = {
                        name : 'Get Public IP',
                        short_description : 'Call public API endpoint of a portal and get public IP',
                        host : portal_hostname,
                        path: '/ip',
                }

	const response = await ff_http_request( request )

	if ( response.has_errors ) {
		console.error( 'Errors', response )
	} {
		// A gentle reminder - just because a server replies 200 OK doesn't mean it will give you a response
		if ( response ) {
			console.log( response.data )
		}
	}

}

main()

/*
// FYI - Response will look like:
{
  "mime_type": "http/response",
  "request": {
    "name": "Get Public IP",
    "short_description": "Call public API endpoint of a portal and get public IP",
    "host": "mastercontrol.redwolfsecurity.com",
    "path": "/ip"
  },
  "actual_request": {
    "mime_type": "axios/request",
    "request": {
      "protocol": "https",
      "port": 443,
      "host": "mastercontrol.redwolfsecurity.com",
      "method": "GET",
      "path": "/ip",
      "timeout": 10000,
      "maxContentLength": 104857600,
      "url": "https://mastercontrol.redwolfsecurity.com:443/ip"
    }
  },
  "start_time_epoch_ms": 1645523335215,
  "data": {
    "requestor_ip": "72.12.177.102",
    "geo": {
      "range": [
        1208778752,
        1208795135
      ],
      "country": "CA",
      "region": "ON",
      "city": "Hamilton",
      "ll": [
        43.241,
        -79.8452
      ],
      "metro": 0
    }
  },
  "http_code": 200,
  "event_message_native": "OK",
  "headers": {
    "server": "nginx/1.17.3",
    "date": "Tue, 22 Feb 2022 09:48:55 GMT",
    "content-type": "application/json; charset=utf-8",
    "content-length": "152",
    "connection": "close",
    "etag": "W/\"98-aIs+n7iNBRv2fExPCTc9/A\"",
    "strict-transport-security": "max-age=31536000; includeSubDomains"
  },
  "end_time_epoch_ms": 1645523335392,
  "elapsed_ms": 177
}
*/
