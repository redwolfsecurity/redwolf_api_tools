import { inspect } from 'util'
import { project } from './project'

/*
 * Visualizes data - in console / ascii or json
*/
export async function visualize( data, options?, scope? ) {

	if ( ! data ) {
		console.error( 'NO DATA')
		return
	}

	// Redact sensitive data that might be there
	delete data?.request?.credentials?.password
	delete data?.request?.credentials?.auth
	delete data?.actual_request

	// Projection?
	let projection
	if ( options?.project ) {
		projection = { ... options.project }
	}

	// Format result
	// If asked for JSON
	if (options?.output_format === 'json') {
		console.log( format_json( data, options, scope ) )
		return
	}
	
	// If data is an http response, and is_error
	if (
		data?.mime_type === 'http/response' &&
		data?.is_error
	) {
		console.error('HTTP REQUEST ERROR', JSON.stringify( data, null, 2 ) )
		return
	}

	// If this is an http/response, and we have data, we'll visualize the data, not the response info
	if (
		data?.mime_type === 'http/response' &&
		data?.data
	) {
		data = data.data
	}

	if ( data?.is_error ) {
		projection[ 'is_error' ] = true
	}

	if ( data?.error ) {
		projection[ 'error' ] = true
	}
	
	// Do data projection
	data = project( data, projection )

	if ( Array.isArray( data ) ) {
		if ( options.is_compact ) {
			console.table( data )
		} else {
			data.forEach( item => console.table( item ) )	
		}
	} else {
		console.table( data )
	}
}

/*
    Formats JSON
*/
function format_json( data?, options?, scope? ) {

	if ( ! data ) return

	// Two cases: one where we have console output
	// Other where we are told to output json directly
	// TODO - Support 1 line per JSON object output
	let output
	if ( options?.output_format === 'json' ) {
		// Case where output_format is set to JSON
		output = JSON.stringify( data, null, 2 )
	} else {
		// Case where we have terminal output
		output = inspect( data, { depth: Infinity, colors: true } )
	}
	return output
}