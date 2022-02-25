All these scripts require three environment variables to be set:


export FF_HOST='organization.xyz.com'
export FF_API_USER='your.name@domain.com'
export FF_API_PASSWORD='your API Password'

Note:
- Your API user is your email address
- Your API PASSWORD is not the one you log in with, it is a separate password token just for API use
- Your role must include api_user in at least one organization for any authenticated API calls to work

Running:

There is a script in the 'bin' directory. We recommend putting it in path.

PATH=${PATH}:${PWD}/bin

Then run:

ff_cli --help


A non-authenticating action to test general API endpoint reachability is:

ff_cli --action network/get_publc_ip


