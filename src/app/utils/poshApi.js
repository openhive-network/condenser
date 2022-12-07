const getTwitterInfo = async (payload) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // Little hack until Peakd opens up by adding CORS headers
        xhr.open('GET', `https://hiveposh.com/api/v0/twitter/${payload.account}`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    const { error } = res;
                    if (error) {
                        console.error('Posh API', error, xhr.responseText);
                        reject(error);
                    }

                    resolve(res);
                } catch (error) {
                    console.error('Posh API', error.message);
                    reject(error);
                }
            } else {
                console.error('Posh API', xhr.status);
                reject(xhr.status);
            }
        };
        xhr.onerror = function (error) {
            console.error('Posh API', error);
            reject(error);
        };
        xhr.send();
    });
};

export default {
    getTwitterInfo,
};
