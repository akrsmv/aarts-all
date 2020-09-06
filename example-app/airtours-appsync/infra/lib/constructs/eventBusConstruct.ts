import cdk = require('@aws-cdk/core')
import lambda = require('@aws-cdk/aws-lambda')
import sns = require('@aws-cdk/aws-sns')
import sqs = require('@aws-cdk/aws-sqs')
import snsSubs = require('@aws-cdk/aws-sns-subscriptions');
import {ENV_VARS__EVENT_BUS_TOPIC, ENV_VARS__TEST_EVENT_BUS_TOPIC} from '../../env-constants'
import { Duration } from '@aws-cdk/core'
import { join } from 'path';
import { LayerVersion, Code } from '@aws-cdk/aws-lambda';
import { FollowMode } from '@aws-cdk/assets';

export interface EventBusConstructProps {
    clientAppName: string,
    nodeModulesLayer: LayerVersion
}

export class EventBusConstruct extends cdk.Construct {

    public readonly eventBus: sns.Topic
    public readonly testEventBus: sns.Topic
    public readonly eventDispatcher: lambda.Function
    public readonly eventDispatcherStressTester: lambda.Function

    constructor(scope: cdk.Construct, id: string, props: EventBusConstructProps) {
        super(scope, id);
        this.eventBus = new sns.Topic(this, 'Bus')
        this.testEventBus = new sns.Topic(this, "TestBus")

        //#region test queue consuming all the messages
        var testQueue = new sqs.Queue(this, "TESTQUEUE", {
            retentionPeriod: Duration.hours(48)
        });
        this.eventBus.addSubscription(new snsSubs.SqsSubscription(testQueue, {
            rawMessageDelivery: true
        }));
        //#endregion

        this.eventDispatcher = new lambda.Function(this, "Dispatcher", {
            runtime: lambda.Runtime.NODEJS_12_X,
            functionName: `${props.clientAppName}-eventDispatcher`,
            code: Code.fromAsset(join("..", props.clientAppName, "dist"), { exclude: ["aws-sdk"], follow: FollowMode.ALWAYS }),
            handler: 'index.dispatcher',
            memorySize: 256,
            timeout: cdk.Duration.seconds(10),
            environment: {  }, //"ENV_ONE": "ENV_ONE_VALUE", "ENV_TWO": "ENV_TWO_VALUE"
            layers: [props.nodeModulesLayer],
            
            // IMPORTANT we dont want retry on a dispatcher level, reties should be only on sqs handler level
            // because if dispatcher reties, it will generate new ringToken, which may result in duplicate items, 
            // out of single create events (which got failed, and retried)
            retryAttempts: 0
        })
        this.grantAccess(this.eventDispatcher)

        this.eventDispatcherStressTester = new lambda.Function(this, "DispatcherStressTester", {
            runtime: lambda.Runtime.NODEJS_12_X,
            functionName: `${props.clientAppName}-eventDispatcherStressTester`,
            code: Code.fromAsset(join("..", props.clientAppName, "dist"), { exclude: ["aws-sdk"], follow: FollowMode.ALWAYS }),
            handler: 'index.dispatcherTester',
            memorySize: 256,
            timeout: cdk.Duration.seconds(100),
            environment: {  }, //"ENV_ONE": "ENV_ONE_VALUE", "ENV_TWO": "ENV_TWO_VALUE"
            layers: [props.nodeModulesLayer],
            
            retryAttempts: 0
        })
        this.grantAccess(this.eventDispatcherStressTester)
    }

    grantAccess(lambdaFunction: lambda.Function) {
        this.eventBus.grantPublish(lambdaFunction)
        lambdaFunction.addEnvironment(ENV_VARS__EVENT_BUS_TOPIC, this.eventBus.topicArn)
        this.testEventBus.grantPublish(lambdaFunction)
        lambdaFunction.addEnvironment(ENV_VARS__TEST_EVENT_BUS_TOPIC, this.testEventBus.topicArn)
    }
}