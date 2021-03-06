import { Command } from 'commander'
 
const package_json = require( '../../package.json' )

const cli = new Command()

cli
	.allowUnknownOption()
	.allowExcessArguments(true)
	.name( package_json.name )
  	.version( package_json.version )
    .option( '--verbose [level]', 'Increase diagnostic information')
    .option( '--action [action]', 'Action to perform')
    .option( '--ff_host [hostname]', 'Hostname or IP of the framework to connect to. Will check ENV FF_HOST.')
    .option( '--ff_user [username]', 'Username to use for authentication. Will check FF_USER.')
    .option( '--ff_password [password]', 'Password to use for authentication. Will check FF_PASSWORD.')
    .option( '--ff_token [token]', 'Token to use to authenticate. Will check FF_TOKEN.')
    .option( '--content_uri [content_uri]', 'Base content URI to use. Will try ENV CONTENT_URI.' )
    .option( '--namespace [namespace]', 'Namespace scope. Will check ENV NAMESPACE.' )
    .option( '--organization [organization]', 'Organization scope. Will check ENV ORGANIZATION.' )
    .option( '--user_contact_email [user_contact_email]')
    .option( '--uri [uri]', 'URI specifies an object' )
    .option( '--set_target [target]', 'Set target parameter. Target is typically fqdn:port or ip:port')
    .option( '--set_url [url]', 'Set URL parameter. URL should be full https://xyz.com/')
    .option( '--quantity [quantity]', 'Set quantity')
    .option( '--duration_m [minutes]', 'Set duration in minutes')
    .option( '--json [json]', 'Provide JSON encoded as a string.')
    .option( '--type [type]', 'Set type')
    .option( '--to [to]', 'Set to')
    .option( '--from [from]', 'Set from')
    .option( '--mime_type [mime_type]', 'Set mime_type')
    .option( '--title [title]', 'Set title')
    .option( '--severity [severity]', 'Set severity')
    .option( '--short_description [short_description', 'Set short_description')
    .option( '--output_format [format]', 'Change format. Default is text. Supports "json"')

cli.parse( process.argv )

const configuration = cli.opts()

export { configuration }


