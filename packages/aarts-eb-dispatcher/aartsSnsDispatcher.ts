import { Context, DynamoDBStreamEvent } from "aws-lambda";
import AWS = require("aws-sdk");
import { AartsEBUtil, AppSyncEvent } from "aarts-eb-types/aartsEBUtil"
import { samLocalSimulateSQSHandlerFromContent } from "./samLocalSimulateSQSHandlerFromContent";
import { processPayload } from "aarts-handler/aartsHandler"
import { prepareAppSyncEventForDispatch } from "aarts-eb-types/prepareAppSyncEventForDispatch"
import { loginfo } from "aarts-utils/utils";
import { IItemManagerCallback } from "aarts-types/interfaces";
import { versionString } from "aarts-utils/utils"
/**
 * forwards to SNS, decorating with:
 * - eventSource = worker:input
 * - ringToken = uuid()
 * If invoked in the context of SAM LOCAL it will call the sqs handler synchronously, skiping the SNS publish part
 */
class aartsSnsDispatcher extends AartsEBUtil {

	constructor() {
		super()
	}

	private async processDynamoDBStreamEvent(event: DynamoDBStreamEvent) {
		let result = {}

		for (const rec of event.Records.filter(record => record.eventSource === "aws:dynamodb" && record.eventName === "MODIFY"
			&& (record.dynamodb?.NewImage as { meta: { S: string } })["meta"].S.startsWith(versionString(0)))) { // fire only for main items
			const item = `${(rec.dynamodb?.Keys as { id: { S: string }, meta: { S: string } }).id.S.substr(0, (rec.dynamodb?.Keys as { id: { S: string }, meta: { S: string } }).id.S.indexOf("|"))}`
			const itemManagerCallback = global.domainAdapter.itemManagers[item] as unknown as IItemManagerCallback<object>;
			await itemManagerCallback._onUpdate(item, rec.dynamodb)
		}

		for (const rec of event.Records.filter(record => record.eventSource === "aws:dynamodb" && record.eventName === "INSERT"
			&& (record.dynamodb?.NewImage as { meta: { S: string } })["meta"].S.startsWith(`v_0`))) { // fire only for main items
			const item = `${(rec.dynamodb?.Keys as { id: { S: string }, meta: { S: string } }).id.S.substr(0, (rec.dynamodb?.Keys as { id: { S: string }, meta: { S: string } }).id.S.indexOf("|"))}`
			const itemManagerCallback = global.domainAdapter.itemManagers[item] as unknown as IItemManagerCallback<object>;
			await itemManagerCallback._onCreate(item, rec.dynamodb)
		}

		return result
	}

	private async processAppSyncEvent(event: AppSyncEvent, ringToken: string, context?: Context) {

		let result
		if (event.action === "query" || event.action === "get") {
			!process.env.DEBUGGER || loginfo('dispatching directly to handler, skipping SNS publishing')
			result = await processPayload({
				meta: {
					ringToken: ringToken,
					eventSource: `worker:${event.eventType === "output" ? event.eventType : "input"}:${event.jobType}`,
					action: event.action,
					item: event.item
				},
				payload: {
					arguments: event.arguments,
					identity: event.identity,
					selectionSetList: event.selectionSetList
				}
			}, context)
		} else if (!process.env["AWS_SAM_LOCAL"]) {
			// used runtime in aws
			const publishInput: AWS.SNS.PublishInput = prepareAppSyncEventForDispatch(event, ringToken)
			result = await this.publish(publishInput)
			// PROD runtime execution ends here

		} else {
			result = await this.samLocalSupport_callSqsHandlerSynchronously(event, ringToken)
		}

		return result
	}

	public dispatch = async (event: AppSyncEvent | DynamoDBStreamEvent, context?: Context): Promise<any> => {
		const ringToken: string = (event as { ringToken: string }).ringToken || this.uuid()
		// log the ringToken
		if (!!(event as { ringToken: string }).ringToken) {
			!process.env.DEBUGGER || loginfo(`using already present ring token:  ${ringToken} for received event`, event)
		} else {
			!process.env.DEBUGGER || loginfo(`generated ring token: ${ringToken} for received event`, event)
		}

		let result
		if (!!(event as AppSyncEvent).action) {
			result = await this.processAppSyncEvent(event as AppSyncEvent, ringToken, context)
		} else {
			//assume a dynamodb stream event
			result = await this.processDynamoDBStreamEvent(event as DynamoDBStreamEvent)
		}

		return {
			statusCode: 200,
			body: { result, ringToken }
		}
	}

	public async samLocalSupport_callSqsHandlerSynchronously(event: AppSyncEvent, ringToken: string) {
		//used sam local runtime
		const sqsEvent = await samLocalSimulateSQSHandlerFromContent(JSON.stringify(event), ringToken);
		!process.env.DEBUGGER || loginfo("AWS_SAM_LOCAL INVOCATION. INVOKING SYNCHRONOUSLY SQS HANDLER")
		!process.env.DEBUGGER || loginfo("sqsEVENT simulated: ", sqsEvent)

		// only run inside local lambda runner
		// Note the endpoint name
		var lambda = new AWS.Lambda({
			endpoint: 'host.docker.internal:3001',
			// endpoint: 'samcliproxy.example.com:3001', not working, 
			// chekout: https://docs.docker.com/docker-for-mac/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host
			// and: https://github.com/awslabs/aws-sam-cli/issues/510#issuecomment-554687309

			sslEnabled: false,
			maxRetries: 2,
			retryDelayOptions: {
				customBackoff: (retryCount: number, err) => {
					!process.env.DEBUGGER || loginfo(new Date() + ": retrying attempt:" + retryCount + ". ERROR " + JSON.stringify(err, null, 4))
					// expecting to retry
					// 1st attempt: 110 ms
					// 2nd attempt: 200 ms
					// 3rd attempt: 1300 ms

					return 100 ^ (retryCount / 2) + (retryCount / 2) * 200;
				}
			}
		})


		// IMPORTANT we dont want retry on a dispatcher level, only on sqs handler level
		// because if dispatcher reties, it will generate new ringToken, which may result in duplicate items, out of single create events (which got failed, and retried)
		// this consideration is reflacted in cdk definition of the dispatcher and this is how it will behave in AWS runtime
		// however here, if the synchronous invocation fails dispatcher will DO retry (SAM local limitation?) 
		await lambda.invoke(
			{
				FunctionName: process.env.AARTS_SQS_HANDLER as string,
				Payload: sqsEvent
			}, (err, data) => {
				console.log("[AWS_SAM_LOCAL]: SNS DISPATCHER PROCESSED EVENT " + sqsEvent)
			}).promise()
	}
}

export const handler = new aartsSnsDispatcher().dispatch