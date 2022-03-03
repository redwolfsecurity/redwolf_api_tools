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

# Get your IP and test the reachability of API   
    ff_cli --action network/get_public_ip  
   
   
# Get defined actions   
    ff_cli \
      --action action/get \
      --organization suborganization.organization.com  
   
# Start an action, if you know the URI (from previous get defined acitons step)   
    ff_cli \
      --action action/start \
      --uri /organizations/organization.com/tests/a12c5dd1-9838-4bbd-9f80-3c23c0c9478f  
   
# Shows you what 'actions' are running   
    ff_cli \
      --action action/get_running \
      --organization organization.com  
   
# Stop a scenario, by its URI   
    ff_cli \
      --action action/stop \
      --uri /organizations/organization.com/tests/a12c5dd1-9838-4bbd-9f80-3c23c0c9478f  
   
# Stop all scenarios, all organizations -- EMERGENCY STOP!   
    ff_cli \
      --action action/stop_all  

# Stop all scenarios, for specific organization   
    ff_cli \
      --action action/stop_all \
      --organization organization.com  
   
# If you want to get an object by its URI   
    ff_cli \
      --action object/get \
      --uri /organizations/organization.com/tests/a12c5dd1-9838-4bbd-9f80-3c23c0c9478f  \
      --output_format json
       
# Copy a scenario from one URI to another organization, and update the target (host:port or ip:port) and url (https://xyz.com)   
    ff_cli \
      --action scenario/copy \
      --uri /organizations/organization.com/tests/a12c5dd1-9838-4bbd-9f80-3c23c0c9478 \
      --organization suborganization.organization.com  \
      --set_target www.target.com:443  \
      --set_url https//www.target.com/login
   
# Provision Traffic Generator Agents
    ff_cli \
      --action provision/agents \
      --type traffic_generator \
      --duration_m 120 \
      --quantity 10 \
      --organization suborganization.organization.com
   
# Provision monitors
    ff_cli \
      --action provision/agents \
      --type monitor \
      --duration_m 120 \
      --quantity 1 \
      --organization suborganization.organization.com
   
# Send a notification
    ff_cli \
      --action notification/message \
      --title 'Ready?'  
      --short_description Hi  

# We expose a general query system   
    ff_cli \
      --action object/query \
      --query 'mime_type=audit/event&$limit=5&$sort:timestamp_epoch_ms=-1'  \
      --output_format json
