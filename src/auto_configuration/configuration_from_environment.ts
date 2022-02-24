// Attempt to fetch configuration parameters from environment variables.

const configuration = {}

const required_environment_variables = [
	{
		environment_variable: 'FF_HOST',				// Hostname of a Fancy Framework instance
		is_required: true
	},
	{
		environment_variable: 'FF_API_USER',			// API Username
		is_requred: true
	},
	{
		environment_variable: 'FF_API_PASSWORD',		// API Password
		is_requred: true
	},
	{
		environment_variable: 'FF_CONTENT_URL',			// Content URL - Typically a CDN like https://cdn.redoki.com/
		is_requred: false
	},
	{
		environment_variable: 'FF_AGENT_HOME',			// Home directory for agent, if environment is set
		is_requred: false
	},
]

required_environment_variables.forEach( variable => {
	const environment_variable = variable.environment_variable
	if ( environment_variable ) {
		const value = process.env[environment_variable]
		if ( typeof value === 'string' ) {
			configuration[environment_variable.toLowerCase()] = value.trim()
		}
	}
})

export { configuration }
