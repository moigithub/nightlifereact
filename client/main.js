// react main
/*global $*/
'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Router, Route, browserHistory, indexRoute, Redirect} from 'react-router';
import auth from './auth';

require("./styles.css");

/////////*********** FLUX THINGS
/////DISPATCHER
var Dispatcher = require('flux').Dispatcher;
var AppDispatcher = new Dispatcher();

////ACTIONS
var action={
    getAllPlaces:function(location, userId){
        //////////*************
        //console.log("localoca",location);
        if(!location){
            alert("getting location");
            getLocationByIP(function(ipdata){
                location=ipdata.city;
                
                
                getBarsByLocation(location, processBars);

            });
        } else {
            
            getBarsByLocation(location, processBars);
        }
        
        //////**************
        
        function processBars(err, data){
            if (err) {
                console.error(err);
                throw err;
            }

            var yelpData = data.businesses;
            
            // get list of users registered by place
            // and combine both data 
            // add some count field
            // add nother field to check if the user is going to that bar, to paint with another color
            var API = "/api/places/"+location;
            $.getJSON(API)
            .done((places)=>{
                //console.log("places",places);
                //console.info("toobj", toObject("placeId", places));
                // [ Location:"texax", PlaceId:"la-casa-1", Users:[1,2,3] ]
                
                var objPlaces = toObject("placeId", places);
                yelpData=yelpData.map((yelp)=>{
                    //var usersGoing = places.filter((place)=> yelp.id==place.placeId)[0];
                    var usersGoing = objPlaces[yelp.id]; // should be faster than filter everytime
                    
                    //console.log("usersGoin",usersGoing);
                    
                    //default values
                    yelp.usersGoing = 0;
                    yelp.imOnList =false;
                    if(usersGoing){
                        var usersGoingCount = usersGoing.users.length;
                        var imOnList = usersGoing.users.indexOf(userId)>-1;
                        
                        yelp.usersGoing = usersGoingCount;
                       // yelp.users = usersGoing;
                        yelp.imOnList = imOnList;
                    }
                    return yelp;
                });

            }).always(()=>{
                //console.log(" yelp Data",yelpData);
                //this.setState({places: yelpData});
                AppDispatcher.dispatch({actionType:"LOAD_PLACES", places: yelpData, location:location});
                
            });//end getJSON "/api/places/:search"
        }//end processBars
        //////////


    },
    toggleMeFromPlace: function(place, search, userId){
        //console.log("toggle", place,search,userId);
        var URL='/api/places';
        $.post(URL,{
            placeId:place.id,
            search: search,
            userId: userId
        })
            .done((placeData)=>{
                //console.log("registered",placeData);
                //var yelpData= this.state.places.slice(); // GET PLACES FROM STORE ?
                var yelpData = PlaceStore.getPlaces();
                yelpData.map(yelp=>{
                    //default values
                    //yelp.usersGoing = 0;
                    //yelp.imOnList =false;
                    if(yelp.id==placeData.placeId){
                        var usersGoingCount = placeData.users.length;
                        var imOnList = placeData.users.indexOf(userId)>-1;
                        
                        yelp.usersGoing = usersGoingCount;
                        yelp.imOnList = imOnList;
                    }
                    
                    return yelp;
                });
                
                //this.setState({places: yelpData});
                //console.log("yelp toggle", yelpData);
                AppDispatcher.dispatch({actionType:"TOGGLE_ME_FROM_PLACE", places:yelpData});
            });
    },
    setUserInfo:function(userInfo, status){
        AppDispatcher.dispatch({actionType:'USER_INFO', userInfo: userInfo, logged: status});
    },
};

/////////////STORE
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var _places=[];
var _currentLocation='' || window.localStorage.barLocation;
var _user={};
var _logged=false;

function loadPlaces(places){
    _places = places;
}
function setLocation(location){
    _currentLocation=location;
    window.localStorage.setItem('barLocation', location);
}
function setUser(userInfo, status){
    _user = userInfo;
    _logged = status;
}

var PlaceStore = assign({}, EventEmitter.prototype, {
    emitChange: function(){  
        this.emit('change'); 
    },
    addChangeListener: function(callback){ 
        this.on('change', callback ); 
    },
    removeChangeListener: function(callback){ 
        this.removeListener('change', callback); 
    },
    getPlaces: function(){ return _places; },
    getLocation:function(){ return _currentLocation; },
    
    getUser:function(){ return _user; },
    isLoggedIn:function(){ return _logged; },
});

//dispatcher callback
AppDispatcher.register(function(action){
 //   console.log("dispatcher payload",action);
    switch(action.actionType){
        case 'LOAD_PLACES':
            console.log("load places from dispatcher",action);
            loadPlaces(action.places);
            setLocation(action.location);
            PlaceStore.emitChange();
            break;
        case 'TOGGLE_ME_FROM_PLACE':
            console.log("toggle places from dispatcher",action);
            loadPlaces(action.places);
            PlaceStore.emitChange();
            break;
        case 'USER_INFO':
            setUser(action.userInfo, action.logged);
            //UserStore.emitChange();  //should be
            PlaceStore.emitChange();
        default:
            console.log("dispatcher callback default");
            return true;
    }
    console.log("calling emit");
    return true;
});


//////////////////********END FLUX THIGS
class Place extends React.Component {
    constructor(props){
        super(props);
    }
    
    render(){
        var buttonText;
        var buttonClass;

        if(this.props.place.imOnList){
            buttonText = "Remove me";
            buttonClass ="btn-danger";
        } else {
            buttonText = "Count me in!";
            buttonClass ="btn-success";
        }
        
        return (
            <li className="list-group-item list-group-item-success">
                <div className="media">
                  <div className="media-left">
                      <img className="media-object" src={this.props.place.snippet_image_url} alt={this.props.place.name+" image"} />
                  </div>
                  <div className="media-body">
                    <h4 className="media-heading">{this.props.place.name}</h4>
                    <p className="snippet">{this.props.place.snippet_text}</p>
                    <p className="address">{this.props.place.location.display_address.join(" - ")}</p>
                  </div>
                  { PlaceStore.isLoggedIn() &&
                  <div className="pull-right">
                    <button className={"btn btn-sm "+buttonClass} onClick={this.props.register}><span className="badge">{this.props.place.usersGoing} Going</span> {buttonText}</button>
                  </div>
                  }
                </div>
            </li>
        );
    }
}

class Main extends React.Component {
    constructor(props){
        super(props);

        this.state = {
            places:[],
            search:'',
//            userId:'125',
            user:{},
//            logged:false,
        };

        this._onChange = this._onChange.bind(this);
        this.getBars = this.getBars.bind(this);
        this.registerPlace = this.registerPlace.bind(this);
        
    }
    
    componentDidMount(){
        PlaceStore.addChangeListener(this._onChange);
        
        /// check if location is set.. then call getBars()
        console.log("mounted",PlaceStore.getLocation());
        if (PlaceStore.getLocation()){
            this.getBars();
        }
    }
    
    componentWillUnmount(){
        PlaceStore.removeChangeListener(this._onChange);
    }
    
    _onChange(){
        console.log("_onChange");
        this.setState({ 
            places: PlaceStore.getPlaces(), 
            search: PlaceStore.getLocation(),
            user: PlaceStore.getUser()
        });
    }
    

////
    ////
    
    getBars(e){
        //helper
        if(e) e.preventDefault();
        var location = this.refs.place.value;
        // if no input and is stored .. probably on localstorage
        if(!location && PlaceStore.getLocation()){
            //use the stored value
            location = PlaceStore.getLocation();
            //update the status input
            this.refs.place.value = location;
        }
       // this.setState({search: location});
        action.getAllPlaces(location, this.state.user.id);
    }//end getBars

    registerPlace(place){
        //console.log(place, this.state);
        var search= PlaceStore.getLocation(),
            userId= this.state.user.id
        
        action.toggleMeFromPlace(place, search, userId);

    }
    
    render(){
        //console.log("main this.props ",this);
        return (
            <div>
                <nav className="menu navbar navbar-default navbar-inverse">
                    <div className="navbar-header">
                        <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#topmenu" aria-expanded="false">
                            <span className="sr-only">Toggle navigation</span>
                            <span className="icon-bar"></span>
                            <span className="icon-bar"></span>
                            <span className="icon-bar"></span>
                        </button>
                        <a href="#" className="navbar-brand">Home</a>
                    </div>
                    
                    { PlaceStore.isLoggedIn() ?
                        <div className="collapse navbar-collapse" id="topmenu">
                            <ul className="nav navbar-nav navbar-right">
                                <li className="navbar-text">Welcome <span>{this.state.user.displayName}</span></li>
                                <li><a href="/auth/logout" className="btn"><span className="fa fa-times"></span> Logout</a></li>
                            </ul>
                        </div>
                    :
                        <div className="collapse navbar-collapse" id="topmenu">
                            <ul className="nav navbar-nav navbar-right">
                                <li className="navbar-text">Login with</li>
                                <li><a href="/auth/twitter" className="btn"><span className="fa fa-twitter"></span> Twitter</a></li>
                            </ul>
                        </div>
                    }
                    
                    
                    
                </nav>

                <div className="container">    
                    <h1 className="text-center">Plans tonight?</h1>
                    <h3 className="text-center">See which bars are hoppin' tonight and RSVP ahead of time!</h3>
                    <h6 className="text-center">Remember: take a cab and drink responsibly.</h6>
                    
                    
                    <div className="row">
                        <div className="col-md-12">
                        <form onSubmit={this.getBars} className="form-horizontal">
                            <div className="input-group">
                              <input type="text" ref="place" className="form-control" placeholder="... Where do you wanna go tonight?" aria-label="location"/>
                              <span className="input-group-btn">
                                <button className="btn btn-danger" type="submit"><span className="glyphicon glyphicon-search"></span> Search a place!</button>
                              </span>
                            </div>
                        </form>
                        </div>
                    </div>
                    


                    <div className="places row">
                        <ul className="list-group col-md-12">
                        {this.state.places.map(function(place, i){
                            return <Place place={place} key={place.id} register={this.registerPlace.bind(null,place)}/>
                        }.bind(this))}
                        </ul>
                        

                    </div>
                </div>
            </div>  
        );
    }
}

////////// HELPERS
function toObject(key, arrayData){
    var obj={};
    arrayData.forEach((data)=>{
        obj[data[key]]=data;
    });
    return obj;
}

function getLocationByIP(callback){
    var IPAPI = "http://ip-api.com/json/?callback=?";
    $.getJSON(IPAPI)
        .done(function(ipdata){
            if(ipdata.status=="success"){
                callback(ipdata);
            }
        });

}

function getBarsByLocation(location, callback){
    var URL = '/api/bars/'+ location;
    $.getJSON(URL)
        .done(function(data) {
            callback(null, data);
        })
        .fail(function( jqXHR, textStatus, err ) {
            callback(err)
        })
}
/////////

//ReactDOM.render(<Main/>, document.getElementById("app"));


class loggedIn extends React.Component {
    constructor(props){
        super(props);
        
    }
    
    componentDidMount(){
            // request user data
            auth.login(function(){
                // redirect to /
                action.setUserInfo(auth.getCurrentUser(), auth.isLoggedIn());
                setTimeout( ()=>{browserHistory.push('/')} ,200);
            });
    }
    
    render(){
        return (
            <div>
                <h1>You are logged in!</h1>
                <p>...redirecting to homepage</p>
            </div>
            );
    }
    
}

class loggedOut extends React.Component {
    constructor(props){
        super(props);
        
    }
    
    componentDidMount(){
            // request user data
            auth.logout(function(){
                action.setUserInfo({},false);
                // redirect to /
                setTimeout( ()=>{browserHistory.push('/')} ,200);
            });
    }
    
    render(){
        return (
            <div>
                <h1>Thanks for playing with us!</h1>
                <p>...redirecting to homepage</p>
            </div>
            );
    }
    
}


ReactDOM.render(
    <Router history={browserHistory}>
        <Route path="/" component={Main}>
            
        </Route>
        <Route path="/login" component={loggedIn}></Route>
        <Route path="/logout" component={loggedOut}></Route>
        <Redirect from="*" to="/"/>
    </Router>
    , document.getElementById("app"));