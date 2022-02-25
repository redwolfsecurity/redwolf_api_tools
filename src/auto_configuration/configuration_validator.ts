
import * as process from 'process'

const understood_attributes = [
	{
		attribute: 'ff_host',				// Hostname of a Fancy Framework instance
		is_required: true
	},
	{
		attribute: 'ff_api_user',			// API Username
		is_required: true
	},
	{
		attribute: 'ff_api_password',		// API Password
		is_required: true
	},
	{
		attribute: 'ff_content_url',			// Content URL - Typically a CDN like https://cdn.redoki.com/
		is_required: false
	},
	{
		attribute: 'ff_agent_home',			// Home directory for agent, if environment is set
		is_required: false
	},
]

/*
 * Given an object, and an array of attribute_definitions
 * Iterates through attribute_definitions, and for each attribute_deifnition, checks to see if that attribute is_required
 * If it is required, it will check to see if the object has it defined or not.
 * If not, the object does not have all required keys and false is returned
 * If no attributes are required in attribute definitions, returns true
 * If all required attributes are present, returns true
*/
function has_all_required_keys( object, attribute_definitions ) {
    let has_all_required_keys = true

    const missing_configuration = []
    for ( const attribute_definition of attribute_definitions ) {
        const attribute = attribute_definition.attribute

        if ( attribute_definition.is_required ) {
            if ( ! object[ attribute ] ) {
                missing_configuration.push( attribute )
                has_all_required_keys = false
            }
        }
    }

    if ( ! has_all_required_keys ) {
        console.error( 'CONFIGURATION ERROR: Missing required configuration for', missing_configuration )
    }
    return has_all_required_keys
}

/*
 * Given a configuration object, will validate the configuration object against this module's understood_attributes
*/
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
            console.error( 'FAILED CONFIGURATION VALIDATION. Validations state is:', validations )
            console.error( 'Use --help to see command line help options.' )
            console.error( 'Terminating' )
            process.exit( 1 )
        }
    }
    return validations
}

export { validate }