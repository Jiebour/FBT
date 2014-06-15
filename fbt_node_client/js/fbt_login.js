$(document).ready(function() {
    if (!window.console) window.console = {};
    if (!window.console.log) window.console.log = function() {};

    $.ajax({
        url: 'http://www.friendbt.com/default',
        type: 'GET',
    })
    .done(function(data) {
        $.cookie("_xsrf", data);
        console.log("success");
    })
    .fail(function() {
        console.log("error");
    })
    .always(function() {
        alert("hehe");
        console.log("complete");
    });
    
    $("#login").on("click", function(event) {
    	if (validate()) {
            login();
        }
        return false;
    });
    $("#pwd").on("keypress", function(e) {
        if (e.keyCode == 13) {
            if (validate()) {
            login();
        }
            return false;
        }
    });
    $("#user").select();
    $(".alert").alert()
});
function validate(){
    if($("user").val() == "" || $("pwd").val() == "")
    {
        $("#hint").html("用户名或者密码未填写.");
        $(".alert").removeClass('hide').addClass('show');
        return false;
    }
    return true;
}
function login() {
    var message = {};
    message["user"] = $("#user").val();
    message["pwd"] = $("#pwd").val();
    message["next"] = "/";
    var disabled = $("#login");
    disabled.disable();
    $.postJSON("http://www.friendbt.com/login", message, function(response) {
        if(response != "0")
        {
        	location.href = "http://www.friendbt.com/";
        }
        else{
            $("#hint").html("用户名或者密码错误.");
        	$(".alert").removeClass('hide').addClass('show');
            $("#user").val("");
            $("#pwd").val("");
        }
        disabled.enable();
    });
}
