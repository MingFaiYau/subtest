import React, { Component } from 'react';
import {
  AppRegistry,
  AppState,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
  NetInfo,
} from 'react-native';

import { GiftedChat } from 'react-native-gifted-chat';
import { gql, graphql, compose } from 'react-apollo'


const createMessage = gql`
mutation createMessage($userId : ID!, $text : String!) {
  createMessage(userId: $userId, text: $text ) {
    _id : id
    text
    createdAt
    user {
      _id : id
      name
    }
  }
}
`

const fetchChatRoomMessages = gql`
query fetchChatRoomMessage {
  allMessages (
    orderBy : id_DESC
  ){
    _id : id
    text
    createdAt
    user {
      _id : id
      name
    }
  }
}
`

const chatRoomMessageSubscription =  gql`
subscription chatRoomMessageSubscription( $userId : ID!) {
  Message (
    filter: {
      mutation_in: [CREATED]
      node : {
        user : {
          id : $userId
        }
      }
    }
  ) {
    node {
      _id : id
      text
      createdAt
      user {
        _id : id
        name
      }
    }
  }
}
`

class Chat extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        loadMore : true,
        messages: []
      };
            
      this._onSend = this._onSend.bind(this)
      this._createMessage = this._createMessage.bind(this)
      this._setSubscribeToNewMessages = this._setSubscribeToNewMessages.bind(this)
      this._onUpdateChatRoomMessages = this._onUpdateChatRoomMessages.bind(this)      
    }

      //functions
  _onUpdateChatRoomMessages = async ( newMessages = [] ) => {
    let messages = []
    if (!Array.isArray(newMessages)) {
      newMessages = [newMessages];
    }

    for ( let i = 0;i < newMessages.length; i++ ) {
      let found = false;
      const msg = newMessages[i];
      
      for ( let j = 0;j < this.state.messages.length ; j++ ) {      
        if ( this.state.messages[j]._id ===  msg._id ){
          found = true;
          break;
        }
      }
      if ( !found ) {
        messages.push(msg);
      }
    }

    if ( messages.length <= 0 ) {
      return;
    }

    if (this.refs.myChat) {
      let allMessages = GiftedChat.append(this.state.messages, messages)
      
      allMessages.sort((a,b)=>{
        const aId = a._id;
        const bId = b._id;
        if (aId < bId) {
          return 1;
        }
        if (aId > bId) {
          return -1;
        }
        return 0;
      })
      
      this.setState((previousState) => {
        return {
          messages: allMessages,
        };
      });
    }
  }

    _setSubscribeToNewMessages = () => {
        this.createMessageSubscription = this.props.fetchChatRoomMessagesQuery.subscribeToMore({
          document: chatRoomMessageSubscription,
          variables : { userId : this.props.userId },
          updateQuery: (previousState, {subscriptionData}) => {
            const newMessage = subscriptionData.Message.node
            return {
              allMessages: newMessage
            }
          }
        })
      }



      _onSend(messages = []) {
        this._createMessage(messages[0].text);
      }
    
      _createMessage = async(text)=> {
        this.props.createMessageMutation({
          variables : { userId : this.props.userId ,text : text}
        })
      }


      componentWillReceiveProps(nextProps){
        console.log("componentWillReceiveProps",nextProps)
        if (!nextProps.fetchChatRoomMessagesQuery.loading && !nextProps.fetchChatRoomMessagesQuery.error) {
          this._onUpdateChatRoomMessages(nextProps.fetchChatRoomMessagesQuery.allMessages)
          
          //auto send message
          this._createMessage("message " + this.state.messages.length );
        }
      }

    componentDidMount() {
        this._setSubscribeToNewMessages()
    }

    render(){
        return (
          <View style={{flex:1}}>
            <GiftedChat
              ref="myChat"
              messages={this.state.messages}
              onSend={this._onSend}
              user={{
                _id: this.props.userId,
              }}
            /> 
          </View>   
        )
      }
}


export default compose(
  graphql(createMessage, {name: 'createMessageMutation'}),
  graphql(fetchChatRoomMessages, {name: 'fetchChatRoomMessagesQuery'}
  ),
)(Chat)
