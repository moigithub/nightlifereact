'use strict';
/*global localStorage*/
/*global $*/

var user = {};  // is stored on client, so not affecting multiple users from diff part of world

module.exports = {
    login:function(cb){
        $.get("/auth/user/")
            .done((data)=>{
                user = data.twitter;
                user.userId = data._id;
                localStorage.token = data._id;
                localStorage.userData = JSON.stringify(user);
                //localStorage.displayName = data.twitter.displayName;
               // console.log("auth login",user);
                //this.setState({user: JSON.stringify(data)});
                
                if(cb) cb();
            })
            .fail(function() {
                console.error( "users/ error getting api/votes data" );
                user = {};
            });
        
    },
    logout:function(cb){
        $.get("/auth/logout")
            .done((data)=>{
                user={};
                delete localStorage.token;
                //delete localStorage.displayName;
            //    console.log("auth logged out");
                if(cb) cb();
            })
            .fail(function() {
                console.error( "auth/logout error getting api/votes data" );
            });        
    },
    getCurrentUser:function(){
        user = JSON.parse(localStorage.userData||"{}");
        return user;
        // deberia recuperar data from localStorage, to prevent lost when refresh
    },
    isLoggedIn:function(){
        return !!localStorage.token;
        /*;
        $.get("/api/users/isLogged")
            .done((data)=>{
                this.setState({status:data});
            })
            .fail(function() {
                console.error( "isLogged error getting api/votes data" );
            });
        
    */
    }
};



/*
localStorage.colorSetting = '#a4509b';
localStorage['colorSetting'] = '#a4509b';
localStorage.setItem('colorSetting', '#a4509b');
localStorage.getItem('bgcolor')
	storage.removeItem(x);
*/