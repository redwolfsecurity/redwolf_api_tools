All these scripts require three environment variables to be set:

	FF_HOST
	FF_API_USER
	FF_API_PASSWORD

E.g.:

export FF_HOST='organization.xyz.com'
export FF_API_USER='your.name@domain.com'
export FF_API_PASSWORD='your API Password'

Note:
- Your API user is your email address
- Your API PASSWORD is not the one you log in with, it is a separate password token just for API use
- Your role must include api_user in at least one organization for any authenticated API calls to work

Running:

node dist/index.js is the main entry point

A bash script, ff_cli is provided as a template in the bin directory

