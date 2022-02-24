import { configuration as configuration_from_environment } from './configuration_from_environment'
import { configuration as configuration_from_cli } from './configuration_from_cli'

import { validate as validate_configuration  } from './configuration_validator'

const configuration = {
	... configuration_from_environment,
	... configuration_from_cli
}

const is_valid = validate_configuration( configuration ) // This will terminate if configuration is not validated.

export { configuration }
