
/*
async function notification_message(data?, options?, scope?) {
	if (!data) return
	const title = data?.title ? data.title : 'Notification Message'
	const short_description = data?.short_description ? data.short_description : ''
	const severity = data?.severity ? data.severity : 'info'
	const to = data?.to ? data.to : '/broadcast'
	const organization = data?.organization ? data.organization : 'system'
	const delivery_message = await create_message_publish_template(
		{
			to: to
		}
	)
	const uuid = uuidv4()
	const notification = {
		mime_type: 'notification/message',
		uri: `/notification/${uuid}`,
		title: title,
		text: short_description,
		severity: severity,
		organization: organization
	}
	console.error('NOTIFICATION', visualize(notification))

	delivery_message.payload.push(notification)
	const result = await deliver_message(delivery_message, options, scope)
	return result
}

export const actions = [
	{
		mime_type : 'action/template',
		action: 'notification/message',
		name: 'Notification Message',
		short_description: 'Send a notification message to users.',
		async_function: notification_message
	}
]

*/