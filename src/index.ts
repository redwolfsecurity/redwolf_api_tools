import { install as install_sourcemap_support } from 'source-map-support'
install_sourcemap_support()
import { configuration } from './auto_configuration'
import { http_request as ff_http_request } from './lib/ff_http_request'
import { readFileSync, readSync } from 'fs'
import * as process from 'process'
import { v4 as uuidv4 } from 'uuid'
import { inspect } from 'util'

function format_json( data?, options?, scope? ) {
	if ( ! data ) return
	// Two cases: one where we have console output
	// Other where we are told to output json directly
	// TODO - Support 1 line per JSON object output
	let output
	if ( options?.output_format === 'json ') {
		// Case where output_format is set to JSON
		output = JSON.stringify( data, null, 2 )
	} else {
		// Case where we have terminal output
		output = inspect( data, { depth: Infinity, colors: true } )
	}
	return output
}

function project(object, projection) {
	if ( !object ) {
		return
	}

	if (!projection) {
		return object
	}

	// If array, project over the elements of the array
	if ( Array.isArray( object ) ) {
		return object.map( ( item ) => { return project( item, projection ) } )
	}

	let projected_object = {}
	for (let key in projection) {
		projected_object[key] = object[key]
	}
	return projected_object
}

async function ff_api_request(data?, options?, scope?) {
	let result

	const api_credentials = scope.api_credentials

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
		},
		{
			action: 'object/save',
			name: 'Save Object',
			short_description: 'Save an object in persistent storage',
			method: 'post',
			path: `/query?uri=${data?.uri}`,
			data: data?.json,
			async_function: save_object,
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
			// path: '/query/tests/live',
			path : `/query?mime_type=test_manager/live_test&active_test=true&${organization_partial}`,
			project: { mime_type: true, uri: true, name: true, description: true, organization: true, error: true }
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
			async_function: provision_agents
		},
		{
			action: 'notification/message',
			name: 'Notification Message',
			short_description: 'Send a notification message to users.',
			async_function: notification_message
		},
	]

	// Sort actions
	action_handler_map.sort( (a,b) => ( a.action > b.action ) ? 1 : ( (b.action > a.action ) ? -1 : 0 ))


	// Handle JSON as JSON, from file, or from stdin
	if ( data?.json ) {
		let is_valid_json = false
		// Case: JSON value is serialized JSON. We convert string to JSON
		try {
			data.json = JSON.parse( data?.json )
			is_valid_json = true
		} catch ( exception ) {
		}
		// CASE: JSON value is filename. We try to read filename, and convert to JSON
		try {
			data.json = JSON.parse( readFileSync( data?.json, 'utf8' ).toString() )
			is_valid_json = true
		} catch ( exception ) {
		}
		// CASE: JSON value is '-', which we will take to be stdin.
		if ( data.json === '-') {
			try {
				data.json = JSON.parse( readFileSync( '/dev/stdin', 'utf8' ).toString() )
				/*
				const bytes = 16 * 1024 * 1024 // 16 megabytes
				const buffer = Buffer.alloc( bytes ) // 16 megabyte buffer
				readSync( 0, buffer, 0, bytes, 0)
				data.json = JSON.parse( buffer.toString() )
				*/
				is_valid_json = true
			} catch ( exception ) {
			}
		}

		if ( ! is_valid_json ) {
			console.error( 'INVALID JSON PARAMETER', data?.json )
			process.exit( 1 )
		}
	}


	if (!data['action']) {
		console.log('Available Actions:')
		console.table(
			project(
					action_handler_map,
					{
						action : true,
						name : true,
						short_description : true
					}
				)
		)
		return
	}

	const action_handler = action_handler_map.find(item => data.action === item.action)

	if ( ! action_handler ) {
		console.error( 'UNKNOWN ACTION', data.action )
	}

	if ( data?.verbose ) {
		console.error('ACTION HANDLER', action_handler)
	}

	if ( typeof action_handler?.async_function == 'function' ) {
		const f = action_handler.async_function
		let request = {
			host: api_credentials.ff_host,
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
			host: api_credentials.ff_host,
			credentials: api_credentials,
			...action_handler
		}

		result = await ff_http_request(request, options, scope )
	}

	// If result is not an error, and we have data, we will return only the data.
	if (
		! result?.is_error &&
		result?.data
	) {
		result = result.data
	}

	const visualization_options = {
		...data
	}

	// We might be asked to project specific fields
	if ( action_handler?.project ) {
		visualization_options.project = action_handler.project
	}

	await visualize(
		result,
		visualization_options
	)

	if ( ! result ) {
		return []
	}

	return result

}

/*
 * Visualizes data - in console / ascii or json
*/
async function visualize( data, options?, scope? ) {

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
		console.log( JSON.stringify( data, null, 2 ) )
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
	
	if ( data ) {
		// Handle the many case
		if ( Array.isArray( data ) ) {
			data.forEach( item => {
				console.table( project( item, projection ))
			})
			return
		} else {
			// Handle the 1 case
			console.table( project( data, projection ) )
			return
		}
	}

	console.error('VISUALIZATION ERROR: Unknown visualization case. Data is:')
	console.log( data )
}

/*
* Copies a scenario from one organization to another
*/
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
	const post_response = await ff_http_request( request, options, scope )
	return source_object
}

/*
 * Get an object by URI
*/
async function get_object_by_uri(data, options, scope) {
	const configuration = scope?.configuration
	if ( data?.verbose ) {
		console.error('GET_OBJECT_BY_URI', 'DATA', data, 'OPTIONS', options, 'SCOPE', scope )
	}
	const request = scope.request
	let object = undefined
	let result = await ff_http_request(request, options, scope)

	if (
		!result?.is_error &&
		result?.data
	) {
		object = result.data
	}
	return object
}

// Save an object. Object must have mime_type and uri
async function save_object(data, options, scope) {
	const request = scope.request
	request.method = 'post'
	request.path = '/'
	request.data = data.json
	return await ff_http_request( request, options, scope  )
}


// Stop all actions that are running
// Can be scoped by organization
async function stop_all( data, options, scope ) {
	// Get all running
	const get_running_scenarios_action = {
		action: 'action/get_running'
	}

	if ( data?.organization ) {
		get_running_scenarios_action['organization'] = data.organization
	}

	const running_scenarios = await ff_api_request( get_running_scenarios_action, options, scope )

	// For each running_scenario, stop it
	if ( Array.isArray(running_scenarios) ) {
		for ( const scenario of running_scenarios ) {
			console.error( 'STOPPING SCENARIO uri=', scenario.uri )
			console.error( 'WITH name=', scenario.name )
			console.error( 'IN organization=', scenario.organization )
			await ff_api_request(
				{
					...data,
					action: 'action/stop',
					uri: scenario.uri
				},
				options,
				scope
			)
		}
	}
}


// Provision Agents
async function provision_agents( data, options, scope ) {


	const organization = data?.organization
	if ( ! organization ) {
		console.error( 'ERROR - organization required')
		return
	}
	
	const duration_m = data.duration_m
	if ( duration_m <= 60 ) {
		console.error( 'ERROR - duration_m must be at least 60')
		return
	}

	const type = 'traffic_generator'
	if ( !data.type ) {
		console.error( 'ERROR - type required. Must be either: traffic_generator | monitor | collector | test_target')
		return
	}

	const namespace = '071cbad7-d14e-4a22-8606-dbb645deb5fb'
	const transaction_id = uuidv4()
	const uuid = uuidv4()

    const provisioning_request = {
        "mime_type": "provision/request_general_cloud_agents",
        "uri": `${namespace}::/organization/${organization}/provision/request_general_cloud_agents/${uuid}`,
        "timestamp_epoch_ms": Date.now(),
        "schedule_enum": "now",
        "provision_object": "agents",
        "transaction_id": transaction_id,
        "provision_distribution_enum": "globally_evenly_distributed",
        "quantity": data.quantity,
        "duration_hours": data.duration_m / 60,
        "duration_minutes": data.duration_m,
        "organization": organization,
        "cpu_count": 2,
        "ram_gb": 8,
		
        "tags": [
        	`${data.type}:true`
        ],
		"user_contact_email": scope.api_credentials.username
	}
	console.error( 'PROVISION AGENTS JSON', format_json( provisioning_request ) )

	// sins?
	provisioning_request["exact_distribution"] = ""

	const to = data?.to ? data.to : '/broadcast'
	const delivery_message = await create_message_publish_template (
		{
			to: to
		}
	)


	delivery_message.payload.push( provisioning_request )
	const result = await deliver_message( delivery_message, options, scope )
	return result

	/*
	const request = scope.request
	request.method = 'post'
	request.path = '/'
	request.data = provisioning_request_template
	const post_response = await ff_http_request( request, options, scope )
	return post_response
	*/
	
    /*
        // "deployment_request_uri": "/organizations/training.redwolfsecurity.com/provisioning/deployment_request/duration_h/1.02/transaction_id/35c6f788-387d-44ce-b3cd-caa88e77868f",

        // Not sure this required for general case
        "regional_distribution": [
        {
            "value": "Australia",
            "content": "Australia",
            "region": "Asia",
            "relative_weight": null
        }
        ],
        "exact_distribution": "",
        */

		/*
        "user_contact_email": "siteadmin@test.com",
        "from": `${ namespace }::/organization/${ organization }/service/provisioning_service/${uuid}`,
        "bandwidth_mbps_max": 1000,
        "created_by": {
        "mime_type": "identity/statement",
        "user_contact_email_template": "[user_contact_email]",
        "user_contact_email": "siteadmin@test.com"
        },
        "subsystem": "provisioning_management",
        "system": "provisioning",
        "agent_role": "traffic generator",
        "state": "requested",
        "last_modification_by": {
        "mime_type": "identity/statement",
        "user_contact_email_template": "[user_contact_email]",
        "user_contact_email": "siteadmin@test.com"
        },
        "last_modified_timestamp_epoch_ms": Date.now(),

        "security_object_policy": {
        "mime_type": "security/object_policy",
        "schema_version": "ff20170505",
        "policy_language": "ff",
        "scope": {
            "can_read": "universe",
            "can_write": "system",
            "can_delete": "system"
        }
        },
        "service": "provisioning_service",
        "is_advanced": "",
        "source": "/provisioning_service/provisioning/provisioning_management",
        "namespace": namespace,
        "uuid": uuid,
        "created_timestamp_epoch_ms": Date.now(),
        "source_template": "/[service]/[system]/[subsystem]"
	
    }
	*/
    //return provisioning_request_template

}

async function notification_message( data?, options?, scope? ) {
	if ( ! data ) return
	const title = data?.title ? data.title : 'Notification Message'
	const short_description = data?.short_description ? data.short_description : ''
	const severity = data?.severity ? data.severity : 'info'
	const to = data?.to ? data.to : '/broadcast'
	const organization = data?.organization ? data.organization : 'system'
	const delivery_message = await create_message_publish_template (
		{
			to: to
		}
	)
	const uuid = uuidv4()
	const notification = {
		mime_type : 'notification/message',
		uri : `/notification/${uuid}`,
		title : title,
		text : short_description,
		severity: severity,
		organization: organization
	}
	console.error( 'NOTIFICATION', format_json( notification ) )

	delivery_message.payload.push( notification )
	const result = await deliver_message( delivery_message, options, scope )
	return result
}

async function create_message_publish_template ( data?, options?, scope? ) {
	const uuid = uuidv4()
	const from = data?.from ? data.from : 'cli_api_tool'
	const to = data?.to ? data.to : '/broadcast'
	const mime_type = data?.mime_type ? data.mime_type : 'delivery/publish_header'

	return {
		uri : `/delivery/${uuid}`,
		mime_type : 'delivery/message',
		header : {
			mime_type : mime_type,
			from: from,
			to: to,
			transaction_id : uuid
		},
		payload : []
	}
}

// Deliver a message to the message delivery endpoint
async function deliver_message ( data?, options?, scope? ) {
	if ( ! data ) return
	/*
	if ( ! Array.isArray( data ) ) {
		data = [ data ]
	}
	*/
	const request = scope.request
	request.method = 'post'
	request.path = '/service/delivery'
	request.data = data
	const post_response = await ff_http_request( request, options, scope )
	return post_response
}


async function main ( data?, options?, scope? ) {
	const api_credentials = {
		mime_type: 'ff/credentials',
		ff_host: data.ff_host,
		username: data.ff_api_user,
		password: data.ff_api_password
	}
	delete data.ff_api_password
	const result = await ff_api_request( data, options, { ...scope, api_credentials } )
}
main( configuration )
