import React, {Component} from "react";
import "./App.css";
import 'bootstrap/dist/css/bootstrap.min.css';

import MediaQuery from "react-responsive";
import SpotifyWebApi from "spotify-web-api-js";
import { Base64 } from 'js-base64';

import Jumbotron from 'react-bootstrap/Jumbotron'
import {Button} from 'react-bootstrap';
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

const spotifyApi = new SpotifyWebApi();
const client_id = ""; // Your client id
const client_secret = ""; // Your secret

class App extends Component{

    constructor(props){
        super(props);

        const params = this.getHashParams();
        const token = params.access_token;

        if (token) {
          spotifyApi.setAccessToken(token);
        }

        // initialize state to change project view within the portfolio
        this.state = {
            "portfolio": "homeview",
            token: token,
            id: "",
            loggedIn: token ? true : false,
            trackUris: [],
            playlistUris: [],
            playlistId: "",
            updateClicked: false
        };
    }

    getNewToken = async function(url = "https://accounts.spotify.com/api/token"){
        const params = this.getHashParams();
        const refreshToken = params.refresh_token;

        let body = {
          "grant_type": "refresh_token",
          "refresh_token": refreshToken
        };

        let formBody = [];

        for (let property in body) {
          let encodedKey = encodeURIComponent(property);
          let encodedValue = encodeURIComponent(body[property]);
          formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");

        let auth = Base64.encode(client_id + ":" + client_secret);

        const response = await fetch(url, {
          method: "POST",
          body: formBody,
          headers:{
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic "+auth
          }
        });

        await response.json().then(data => {
          this.setState({token: data.access_token});
        });
    }

    //to decode authentication token
    getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        e = r.exec(q)
        while (e) {
           hashParams[e[1]] = decodeURIComponent(e[2]);
           e = r.exec(q);
        }
        return hashParams;
    }

    //create new playlist called "Recently Played"
    createRecentlyPlayedPlaylist = async function(url = "https://api.spotify.com/v1/users/"+this.state.id+"/playlists", data = {}){
        const authToken = this.state.token;
        await fetch(url, {
          method: "POST",
          body: JSON.stringify({
            name: "Recently Played",
            description: "recent_tracks",
            public: false
          }),
          headers: {
            "Authorization": "Bearer "+authToken,
            "Content-Type": "application/json"
          }
        });
    }

    //get user id
    getUserId = async function(url = "https://api.spotify.com/v1/me", data = {}){
        await this.getNewToken();
        const authToken = this.state.token;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": "Bearer "+authToken,
          }
        });

        await response.json().then(data => {
          this.setState({id: data.id});
        });

    }

    //get playlist id
    getPlaylistId = async function(url = "https://api.spotify.com/v1/users/"+this.state.id+"/playlists?limit=50", data = {}){
        const authToken = this.state.token;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": "Bearer "+authToken,
            "Content-Type": "application/json"
          }
        });

        await response.json().then(data => {

          let playlistId = "";
          data.items.forEach(item => {
            if(item.description === "recent_tracks"){
              playlistId = item.id
            }
          });

          this.setState({
            playlistId: playlistId
          });

        });
    }

    //grab trackUris of 50 most recently played tracks
    getRecentlyPlayedTracks = async function(url = "https://api.spotify.com/v1/me/player/recently-played?limit=50", data = {}){
        const authToken = this.state.token;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": "Bearer "+authToken,
          }
        });

        await response.json().then(data => {

          let trackUris = [];

          data.items.forEach(item => {
            trackUris.push(item.track.uri);
          });

          this.setState({trackUris:trackUris});

        });
    }

    // add recently played tracks to playlist
    addRecentlyPlayedTracks = async function(url = "https://api.spotify.com/v1/playlists/"+this.state.playlistId+"/tracks", data = {}){
        const authToken = this.state.token;
        let trackUris = JSON.stringify(this.state.trackUris);
        await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": "Bearer "+authToken,
            "Content-Type": "application/json"
          },
          body: trackUris
        });
    }

    //get uris of tracks currently in the recently played playlist
    getPlaylistUris = async function(url = "https://api.spotify.com/v1/playlists/"+this.state.playlistId+"/tracks?limit=50", data = {}){
        const authToken = this.state.token;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": "Bearer "+authToken
          }
        });

        await response.json().then(data => {
          let playlistUris = [];

          data.items.forEach(item => {
            playlistUris.push(item.track.uri);
          });

          this.setState({playlistUris: playlistUris});

        });

    }

    //clear playlist - for updating so that the playlist doesn't get massive
    clearRecentlyPlayedTracks = async function(url = "https://api.spotify.com/v1/playlists/"+this.state.playlistId+"/tracks", data = {}){
        let authToken = this.state.token;
        this.getPlaylistUris();
        let playlistUris = this.state.playlistUris;
        let tracks = [];

        playlistUris.forEach(uri => {
          let trackObject = {
            uri: uri
          }
          tracks.push(trackObject);
        });

        await fetch(url, {
          method: "DELETE",
          headers: {
            "Authorization": "Bearer "+authToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
          "tracks": tracks
          })
        });

  }

    //create playlist if it doesn't already exist
    //clear playlist contents
    //fill with recently played
    update = async function(){
        await this.getUserId();
          if(this.state.id){
            await this.getPlaylistId()
                if(!this.state.playlistId){
                    await this.createRecentlyPlayedPlaylist();
                    await this.getPlaylistId();
                    await this.getRecentlyPlayedTracks();
                    await this.addRecentlyPlayedTracks();
                }
                else {
                    await this.getPlaylistId();
                    await this.getPlaylistUris();
                    await this.clearRecentlyPlayedTracks();
                    await this.getRecentlyPlayedTracks();
                    await this.addRecentlyPlayedTracks();
                }
        }
        this.setState({updateClicked: true});
    }

    checkToken = () => {
        const authToken = this.state.token;

        fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
                "Authorization": "Bearer "+authToken,
                "Content-Type": "application/json"
            }
        })
            .then((response) => {
                if(response.status === 401){
                    this.getNewToken();
                }
            })


    }

    render(){

        let {loggedIn, updateClicked} = this.state;

        return (
            <div className="App">
                <Container>
                    <Row>
                        <MediaQuery query="(min-width: 768px)">
                            <Col className = "autoCenter">
                                <Jumbotron className = "backgroundColor">
                                  <h1>Hello, friend!</h1>
                                  <div>
                                    Welcome to my "Recently Played Playlist" Spotify App! In just two clicks you should have a playlist in your spotify
                                    library containing the 50 most recently played tracks on your account.
                                  </div>
                                  <div className = "mt3">
                                    Simply log in below, and once logged in, click the "Create / Refresh Playlist" button to either create the playlist,
                                    or refresh the most recent songs in the playlist if you've already used this app. Currently, it only counts a song
                                    if you have played it through until the end, but I believe this is due to one of the Spotify API endpoints I'm using
                                    being in beta. Feel free to email me if you have any questions!
                                  </div>
                                  <div>
                                    <Button
                                        className="spotifyGreen mt4 f6 dim br-pill"
                                        href = "https://9uvs2mat0k.execute-api.us-west-2.amazonaws.com/latest/login">
                                            Login to Spotify!
                                    </Button>
                                    {(loggedIn && !updateClicked) &&
                                        <div className="mt3">
                                            <button
                                                onClick={this.update}
                                                className="spotifyGreen mt2 f6 dim br-pill"
                                            >
                                                Create / Refresh Playlist
                                            </button>
                                        </div>
                                    }
                                    {(loggedIn && updateClicked) &&
                                        <div className="mt3">
                                            Woo! Your playlist should be created and available in your Spotify library.
                                        </div>
                                    }
                                  </div>
                                </Jumbotron>
                            </Col>
                        </MediaQuery>
                        <MediaQuery query="(max-width: 768px)">
                            <Col className = "autoCenterMobile">
                                <Jumbotron className = "backgroundColor">
                                  <h1>Hello, friend!</h1>
                                  <div>
                                    Welcome to my "Recently Played Playlist" Spotify App! In just two clicks you should have a playlist in your spotify
                                    library containing the 50 most recently played tracks on your account.
                                  </div>
                                  <div>
                                    Simply log in below, and once logged in, click the "Create / Refresh Playlist" button to either create the playlist,
                                    or refresh the most recent songs in the playlist if you've already used this app. Currently, it only counts a song
                                    if you have played it through until the end, but I believe this is due to one of the Spotify API endpoints I'm using
                                    being in beta. Feel free to email me if you have any questions!
                                  </div>
                                  <div className = "mt3">

                                  </div>
                                  <div className = "flex justify-center">
                                    <Button
                                        className="spotifyGreen mt4 f6 dim br-pill"
                                        href = "https://9uvs2mat0k.execute-api.us-west-2.amazonaws.com/latest/login">
                                        Login to Spotify!
                                    </Button>
                                  </div>
                                  <div className = "flex justify-center">
                                    {(loggedIn && !updateClicked) &&
                                        <div className="mt3">
                                            <button
                                                onClick={this.update}
                                                className="spotifyGreen mt2 f6 dim br-pill mr2 "
                                            >
                                                Create / Refresh Playlist
                                            </button>
                                        </div>
                                    }
                                    {(loggedIn && updateClicked) &&
                                        <div className="mt3">
                                            Woo! Your playlist should be created and available in your Spotify library.
                                        </div>
                                    }
                                  </div>
                                </Jumbotron>
                            </Col>
                        </MediaQuery>
                    </Row>
                </Container>
            </div>
        );
    }
}

export default App;
