


 export const sendMessage = (phoneNumber,otp)=>{

    if (phoneNumber && otp) {
        console.log(otp + " sent to " + phoneNumber);
        return true
    }else{
        return false
    }

}

 