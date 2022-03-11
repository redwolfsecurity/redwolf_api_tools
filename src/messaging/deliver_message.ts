// Deliver a message to the message delivery endpoint
import { http_request as ff_http_request } from '../lib/ff_http_request'

export async function deliver_message ( data?, options?, scope? ) {
	if ( ! data ) return

	const request = scope?.request
	if ( ! request ) throw "UNABLE_TO_DELIVER_MESSAGE"

	request.method = 'post'
	request.path = '/service/delivery'
	request.data = data
	const post_response = await ff_http_request( request, options, scope )
	return post_response
}