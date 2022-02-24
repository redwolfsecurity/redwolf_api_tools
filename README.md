All these scripts require threeenvironment variables to be set:

	FF_HOST
	FF_API_USER
	FF_API_PASSWORD

# Credential testing
credential test
identity get
session get

# Namespace Management
namespace create
	{
		name: '',
		short_description: ''
	}

Note: namespaces can not be deleted once created.

# Organization Management
	
Organizations are created within a namespace

organization list
	--namespace
	--organization

organization create
	--organization

organization delete

organization add_user
	--user_contact_email
	--organization

organization remove_user

# User / Identity Management

user create
	--organization
	--user_contact_email
	--is_api_user

user update

user delete

user set_password
	--user_contact_email
	--new_password
	
# Role Management
role get_all
role get
role create
role remove

# Scenario Management
scenario get
scenario get_running
scenario stop
scenario stop_all_running_for_organization
scenario stop_all_running_globally



