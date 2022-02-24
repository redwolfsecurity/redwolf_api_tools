
import * as process from 'process'

const understood_attributes = [
	{
		attribute: 'ff_host',				// Hostname of a Fancy Framework instance
		is_required: true
	},
	{
		attribute: 'ff_api_user',			// API Username
		is_requred: true
	},
	{
		attribute: 'ff_api_password',		// API Password
		is_requred: true
	},
	{
		attribute: 'ff_content_url',			// Content URL - Typically a CDN like https://cdn.redoki.com/
		is_requred: false
	},
	{
		attribute: 'ff_agent_home',			// Home directory for agent, if environment is set
		is_requred: false
	},
]

function has_all_required_keys( object, attribute_definitions ) {
    let is_valid = true

    for ( const attribute_definition of attribute_definitions ) {
        const attribute = attribute_definition.attribute

        if ( ! object[ attribute ] && attribute_definition.is_required ) {
            console.error( 'Configuration Validation: Missing required configuration for', attribute )
            is_valid = false
        }
    }
    return is_valid
}

function validate( configuration ) {
    const validations = {
        has_all_required_keys : false
    }

    if ( ! Array.isArray( configuration ) ) {
        configuration = [ configuration ]
    }

    configuration.forEach( item => {
        validations.has_all_required_keys = has_all_required_keys( item, understood_attributes )
    })

    // Check if all validations passed or failed.
    for ( const key in validations ) {
        if ( ! validations[ key ] ) {
            console.error( 'Failed configuration validation. Validations state is:', validations )
            console.error( 'Use --help to see command line help options.' )
            console.error( 'Terminating' )
            process.exit( 1 )
        }
    }
    return validations
}

export { validate }