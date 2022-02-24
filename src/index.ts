import { configuration } from './auto_configuration'
import { http_request as ff_http_request } from './lib/ff_http_request'
import * as nested_replace from 'json-nested-replace'
import * as replace_key from 'recursive-key-replace'

function project(object, projection) {
	if (!projection) {
		return object
	}
	let projected_object = {}
	for (let key in projection) {
		projected_object[key] = object[key];
	}
	return projected_object;
}

async function main(data?, options?, scope?) {
	let output
	let result

	// The credentials for our API.
	const api_credentials = {
		mime_type: 'ff/credentials',
		username: data.ff_api_user,
		password: data.ff_api_password
	}

	delete data.ff_api_password

	let base_uri = ''
	if (data.uri) {
		base_uri = data.uri.replace('#live', '')
	}

	if ( data?.verbose ) {
		console.error('CONFIGURATION IS', data)
	}

	let organization_partial = ''
	if (data?.organization) {
		organization_partial = `&organization=${data?.organization}`
	}

	const action_handler_map = [
		{
			action: 'object/get',
			name: 'Get Objet',
			short_description: 'Get an object by its uri',
			path: `/query?uri=${data?.uri}`,
			// async_function : get_object_by_uri,
			// project : { mime_type : true, uri: true }
		},
		{
			action: 'object/save',
			name: 'Save Object',
			short_description: 'Save an object in persistent storage',
			method: 'post',
			path: `/query?uri=${data?.uri}`,
			data: data?.json,
			// async_function: save_object,
			// project : { mime_type : true, uri: true }
		},
		{
			action: 'object/query',
			name: 'Query objects',
			short_description: 'Query objects using REST query syntax',
			path: `/query?${data?.query}`
		},
		{
			action: 'network/get_public_ip',
			name: 'Get Public IP',
			short_description: 'Get public IP from maxmind database from ff_api',
			path: '/ip'
		},
		{
			action: 'action/get_running',
			name: 'Get running actions',
			short_description: 'Lists running actions',
			path: '/query/tests/live',
			project: { mime_type: true, scenario_uri: true, scenario_name: true, scenario_description: true, organization: true, error: true }
		},
		{
			action: 'action/get',
			name: 'Get defined actions',
			short_description: 'Lists defined which are currently defined',
			path: `/test_manager/tests/?${organization_partial}`,
			project: { mime_type: true, uri: true, name: true, description: true, organization: true, error: true }
		},
		{
			action: 'action/start',
			name: 'Starts action by URI',
			short_description: 'Starts an action by the specified URI',
			path: `/action/start?uri=${data?.uri}`,
			project: { mime_type: true, uri: true, name: true, description: true, organization: true, error: true }
		},
		{
			// https://imperva.redwolfsecurity.com/action/stop?uri=/organizations/imperva.com/tests/a12c5dd1-9838-4bbd-9f80-3c23c0c9478f
			action: 'action/stop',
			name: 'Stops action by URI',
			short_description: 'Stops an action by the specified URI',
			path: `/action/stop?uri=${data.uri}`,
			project: { mime_type: true, uri: true, name: true, description: true, organization: true, error: true }
		},
		{
			action: 'action/stop_all',
			name: 'Stops all actions that are running',
			short_description: 'Stops all actions that are running',
			async_function: stop_all
		},
		{
			action: 'scenario/copy',
			name: 'Scenario Copy',
			short_description: 'Copy a scenario from one URI to a new user',
			project: { mime_type: true },
			async_function: scenario_copy
		},
		{
			action: 'provision/agents',
			name: 'Provision Agents',
			short_description: 'Provision Agents',
			project: { mime_type: true }
		},
	]


	if (!data['action']) {
		console.log('Available Actions:')
		console.table(action_handler_map)
		return
	}

	const action_handler = action_handler_map.find(item => data.action === item.action)

	if ( data?.verbose ) {
		console.error('ACTION handler', action_handler)
	}

	if ( typeof action_handler?.async_function == 'function' ) {
		const f = action_handler.async_function
		let request = {
			host: data.ff_host,
			credentials: api_credentials,
			...action_handler
		}
		if ( data?.verbose ) {
			console.error('CALLING FUNCTION', data)
		}
		result = await f.call( this, data, action_handler , { request, api_credentials, configuration } )
		
	} else if (action_handler?.path) {
		// Test request
		let request = {
			host: data.ff_host,
			credentials: api_credentials,
			...action_handler
		}

		result = await ff_http_request(request)
	}


	if ( ! result ) {
		return []
	}

	// Redact sensitive data
	delete result?.request?.credentials?.password
	delete result?.request?.credentials?.auth
	delete result?.actual_request

	// Format result
	if (data?.output_format === 'json') {
		console.log( JSON.stringify( result, null, 2 ) )
	} else {
		if (result.is_error) {
			console.error('Errors', result)
		} {
			// A gentle reminder - just because a server replies 200 OK doesn't mean it will give you a response
			if (result.data) {
				if (Array.isArray(result.data)) {
					result.data.forEach(item => {
						console.table(project(item, action_handler.project))
					})
				} else {
					console.table(project(result.data, action_handler.project))
				}
				console.error(`elapsed_ms : ${result.elapsed_ms}`)
			}
		}
	}


}

async function scenario_copy(data, options, scope) {
	scope.request.path = `/query?uri=${data.uri}`

	let source_object = await get_object_by_uri( data, options, scope )

	source_object = source_object[0]

	if ( ! source_object ) return

	if ( (! source_object?.cells) ||
		source_object?.mime_type !== 'test_manager/test'
	) {
		console.error('SOURCE OBJECT NOT CORRECT TYPE', source_object )
		return
	}

	console.error('COPYING uri', source_object.uri )
	console.error('NAME:', source_object?.name )
	console.error('DESCRIPTION', source_object?.description )

	let cells_string = source_object.cells

	if ( data?.set_target ) {
		console.error('SETTING target to', data.set_target)
		let new_cells_string = source_object.cells.replace( 'amplify.imperva.com:443', data.set_target)
		source_object.cells = new_cells_string
	}
	if ( data?.set_url ) {
		console.error('SETTING url to', data.set_url)
		let new_cells_string = source_object.cells.replace( 'https://amplify.imperva.com/', data.set_url)
		source_object.cells = new_cells_string
	}
	if ( data?.organization ) {
		console.error('SETTING organization to', data.organization)
		source_object.organization = data.organization
		source_object.uri = `organizations/${data.organization}/tests/b28826a1-d9e9-48f9-9990-ca8a24abda3c',`
	}
	delete source_object['organization_oid']
	console.error('New URI is', source_object.uri)
	// POST Object to save it
	const request = scope.request
	request.method = 'post'
	request.path = '/'
	request.data = source_object
	const post_response = await ff_http_request( request )
	return source_object
}

async function get_object_by_uri(data, options, scope) {
	const configuration = scope?.configuration
	if ( data?.verbose ) {
		console.error('GET_OBJECT_BY_URI', 'DATA', data, 'OPTIONS', options, 'SCOPE', scope )
	}
	const request = scope.request
	let object = undefined
	let result = await ff_http_request(request)

	if (
		!result?.is_error &&
		result?.data
	) {
		object = result.data
	}
	return object
}

/*
async function save_object(data, options, scope) {
	const configuration = scope?.configuration
	const configuration = scope?.configuration

	const request = scope.request
	const action = data
	const request = {
		method: 'post',
		host: data.ff_host,
		credentials: api_credentials,
		...action_handler
	}
}
*/

// Stop all actions that are running
async function stop_all() {

}


main(configuration)
