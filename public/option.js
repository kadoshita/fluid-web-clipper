(() => {
    const apiEndpointUrl = document.getElementById('api-endpoint-url');
    const apiToken = document.getElementById('api-token');
    const saveButton = document.getElementById('save-button');
    const status = document.getElementById('status');

    chrome.storage.sync.get({
        apiEndpointUrl: 'https://fluid.example.com',
        apiToken: ''
    }, items => {
        apiEndpointUrl.value = items.apiEndpointUrl;
        apiToken.value = items.apiToken;
    });

    saveButton.addEventListener('click', () => {
        status.innerText = 'Saving...';
        chrome.storage.sync.set({
            apiEndpointUrl: apiEndpointUrl.value,
            apiToken: apiToken.value
        }, () => {
            status.innerText = 'Saved';
            setTimeout(() => {
                status.innerText = '';
            }, 1000);
        })
    })
})();