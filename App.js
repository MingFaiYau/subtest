/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  AsyncStorage
} from 'react-native';

import Chat from './Chat.js'
//client 2.0
import ApolloClient from 'apollo-client';
import { HttpLink,createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloProvider } from 'react-apollo';
import { ApolloLink } from 'apollo-link';
//for sub
import { WebSocketLink } from "apollo-link-ws";
import { SubscriptionClient } from 'subscriptions-transport-ws';

const GC_ENDPOINT = "https://api.graph.cool/simple/v1/cj8x7ubz503n60189b0k306w6"
const GC_SUB = "wss://subscriptions.ap-northeast-1.graph.cool/v1/cj8x7ubz503n60189b0k306w6"
const SECRET = "fortesting"



export default class App extends Component<{}> {
  constructor(props) {
    super(props);
    this.state = {
      userId : '' ,
      client : null ,
    }

    this._login = this._login.bind(this)    
    this._setupClient = this._setupClient.bind(this)
    this._postToServer = this._postToServer.bind(this)
  }

  componentDidMount(){
    this._login();
  }

  _postToServer = async (postBody) => {
    const result = await fetch(GC_ENDPOINT, {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: postBody
    }).then((respone)=>respone.json())
    .catch((error)=>error)
    console.log("result",result)
    return result;
  }

  _login = async ()=> {
    const authUserBody = JSON.stringify({
      query : `
        mutation {
          authenticateAnonymousUser(secret : "fortesting" ) {
            id
            token
          }
        }
      `
    })

    const result = await this._postToServer(authUserBody);
    if ( result.data && result.data.authenticateAnonymousUser && 
      result.data.authenticateAnonymousUser.id && result.data.authenticateAnonymousUser.token ) {
      const userId = result.data.authenticateAnonymousUser.id;
      const userToken = result.data.authenticateAnonymousUser.token;
        
      //update userId
      this.setState({
        userId : userId
      })
    
      //keep going
      this._setupClient(userToken)
    }
  }

  _setupClient = (userToken) => {
    const httpLink = createHttpLink({ uri: GC_ENDPOINT })

    const middlewareLink = new ApolloLink((operation, forward) => {
      operation.setContext({
        headers: {
          authorization: `Bearer ${userToken}` || null
        }
      });
      return forward(operation)
    })
    
    const epLink = middlewareLink.concat(httpLink);


    const wsClient = new SubscriptionClient(GC_SUB, {
      reconnect: true,
      connectionParams: {
        Authorization: `Bearer ${userToken}`
      }
    });
    
    const wsLink = new WebSocketLink(wsClient)

    const hasSubscriptionOperation = ({ query: { definitions } }) =>
    definitions.some(
      ({ kind, operation }) =>
        kind === 'OperationDefinition' && operation === 'subscription',
    )
  
    const combineLink = ApolloLink.split(
      hasSubscriptionOperation,
      wsLink,
      epLink
    )
    
    const client = new ApolloClient({
      link: combineLink,
      cache: new InMemoryCache().restore(window.__APOLLO_STATE__),
    });

    this.setState({
      client : client
    })
  }

  render() {
    const loading = this.state.client === null || this.state.userId === ''
    
    return (
      loading ?  (
        <View style = {styles.container}>
          <ActivityIndicator
            animating={loading}
            size="large"
            style = {styles.activityIndicator}
          />
        </View>
        ) : ( 
        <ApolloProvider client={this.state.client} >
          <Chat userId={this.state.userId}/> 
        </ApolloProvider>
        )
    );
  }
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
