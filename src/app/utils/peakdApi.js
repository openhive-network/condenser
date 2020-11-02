const getBadges = async payload => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // Little hack until Peakd opens up by adding CORS headers
        xhr.open(
            'GET',
            `https://peakd.com/api/public/badge/${payload.account}`
        );
        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    const { error } = res;
                    if (error) {
                        console.error('Peakd badges', error, xhr.responseText);
                        reject(error);
                    }

                    resolve(res);
                } catch (error) {
                    console.error('Peakd badges', error.message);
                    reject(error);
                }
            } else {
                console.error('Peakd badges', xhr.status);
                reject(xhr.status);
            }
        };
        xhr.onerror = function(error) {
            console.error('Peakd badges', error);
            reject(error);
        };
        xhr.send();
    });
};

export default {
    getBadges,
};
