const getBadges = async payload => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `https://hivebuzz.me/api/badges/${payload.account}`);
        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    const { error } = res;
                    if (error) {
                        console.error(
                            'Hivebuzz badges',
                            error,
                            xhr.responseText
                        );
                        reject(error);
                    }

                    resolve(res);
                } catch (error) {
                    console.error('Hivebuzz badges', error.message);
                    reject(error);
                }
            } else {
                console.error('Hivebuzz badges', xhr.status);
                reject(xhr.status);
            }
        };
        xhr.onerror = function(error) {
            console.error('Hivebuzz badges', error);
            reject(error);
        };
        xhr.send();
    });
};

export default {
    getBadges,
};
