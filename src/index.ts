import { configuration } from './auto_configuration'
import { http_request as ff_http_request } from './lib/ff_http_request'
import { readFileSync, readSync } from 'fs'
import * as process from 'process'

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

async function main(data?, options?, scope?) {
	let result

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

	return result

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

// Save an object. Object must have mime_type and uri
async function save_object(data, options, scope) {
	const request = scope.request
	request.method = 'post'
	request.path = '/'
	request.data = data.json
	return await ff_http_request( request )
}


// Stop all actions that are running
async function stop_all() {

}


// Provision Agents
function provision_agents( data, options, scope ) {
	/*
    transaction_id = '77c4023f-fb5a-4ef9-a04e-1be7ac543bbd' // uuid
    namespace = '071cbad7-d14e-4a22-8606-dbb645deb5fb' // Change
    uuid = '6fdf296d-e28a-4e1b-b126-6d86db4a0db0' // Change dynamically

    const provisioning_request_template = {
        "mime_type": "provision/request_general_cloud_agents",
        "uri": `${namespace}::/organization/${data.organization}/provision/request_general_cloud_agents/${uuid}`,
        "timestamp_epoch_ms": Date.now(),
        "schedule_enum": "now",
        "provision_object": "agents",
        "transaction_id": transaction_id,
        "provision_distribution_enum": "globally_evenly_distributed",
        "quantity": data.quantity,
        "duration_hours": data.duration_m / 60,
        "duration_minutes": data.duration_m,
        "organization": data.organization,
        "cpu_count": 2,
        "ram_gb": 8,
        "tags": [
        "traffic_generator:true"
        ],
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

main(configuration)
