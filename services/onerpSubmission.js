// services/onerpSubmission.js
const { chromium } = require('playwright');

async function submitToONErpm(submission) {
    let browser;
    
    try {
        console.log(`[ONErpm] Starting submission for: ${submission.primaryArtist} - ${submission.productTitle}`);
        
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setViewportSize({ width: 1280, height: 800 });
        
        console.log('[ONErpm] Navigating to form...');
        await page.goto('https://forms.gle/kPnaaztgcRdb9Xn28', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        console.log('[ONErpm] Form loaded, filling fields...');

        // Helper functions
        async function fillInputByLabel(labelText, value) {
            if (!value) return;
            try {
                const input = await page.evaluateHandle((label) => {
                    const labels = Array.from(document.querySelectorAll('.freebirdFormviewerComponentsQuestionBaseTitle'));
                    const targetLabel = labels.find(l => l.textContent.trim().includes(label));
                    if (!targetLabel) return null;
                    const questionDiv = targetLabel.closest('.freebirdFormviewerComponentsQuestionBaseRoot');
                    return questionDiv ? questionDiv.querySelector('input[type="text"]') : null;
                }, labelText);
                
                const inputElement = input.asElement();
                if (inputElement) {
                    await inputElement.click();
                    await inputElement.type(value, { delay: 50 });
                    console.log(`[ONErpm] Filled: ${labelText}`);
                }
            } catch (err) {
                console.log(`[ONErpm] Could not fill ${labelText}:`, err.message);
            }
        }

        async function fillTextareaByLabel(labelText, value) {
            if (!value) return;
            try {
                const textarea = await page.evaluateHandle((label) => {
                    const labels = Array.from(document.querySelectorAll('.freebirdFormviewerComponentsQuestionBaseTitle'));
                    const targetLabel = labels.find(l => l.textContent.trim().includes(label));
                    if (!targetLabel) return null;
                    const questionDiv = targetLabel.closest('.freebirdFormviewerComponentsQuestionBaseRoot');
                    return questionDiv ? questionDiv.querySelector('textarea') : null;
                }, labelText);
                
                const textareaElement = textarea.asElement();
                if (textareaElement) {
                    await textareaElement.click();
                    await textareaElement.type(value, { delay: 50 });
                    console.log(`[ONErpm] Filled: ${labelText}`);
                }
            } catch (err) {
                console.log(`[ONErpm] Could not fill ${labelText}:`, err.message);
            }
        }

        async function selectDropdownByLabel(labelText, value) {
            if (!value) return;
            try {
                await page.evaluate((label, val) => {
                    const labels = Array.from(document.querySelectorAll('.freebirdFormviewerComponentsQuestionBaseTitle'));
                    const targetLabel = labels.find(l => l.textContent.trim().includes(label));
                    if (!targetLabel) return;
                    const questionDiv = targetLabel.closest('.freebirdFormviewerComponentsQuestionBaseRoot');
                    const select = questionDiv ? questionDiv.querySelector('select') : null;
                    if (select) {
                        const options = Array.from(select.options);
                        const option = options.find(o => o.textContent.includes(val));
                        if (option) {
                            select.value = option.value;
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                }, labelText, value);
                console.log(`[ONErpm] Selected: ${labelText} = ${value}`);
            } catch (err) {
                console.log(`[ONErpm] Could not select ${labelText}:`, err.message);
            }
        }

        async function selectRadioByLabel(labelText, value) {
            if (!value) return;
            try {
                await page.evaluate((label, val) => {
                    const labels = Array.from(document.querySelectorAll('.freebirdFormviewerComponentsQuestionBaseTitle'));
                    const targetLabel = labels.find(l => l.textContent.trim().includes(label));
                    if (!targetLabel) return;
                    const questionDiv = targetLabel.closest('.freebirdFormviewerComponentsQuestionBaseRoot');
                    if (!questionDiv) return;
                    
                    const radioLabels = Array.from(questionDiv.querySelectorAll('.docssharedWizToggleLabeledLabelText'));
                    const targetRadio = radioLabels.find(rl => rl.textContent.trim() === val);
                    if (targetRadio) {
                        const radioContainer = targetRadio.closest('.freebirdFormviewerComponentsQuestionRadioChoice');
                        const radio = radioContainer ? radioContainer.querySelector('input[type="radio"]') : null;
                        if (radio) {
                            radio.click();
                        }
                    }
                }, labelText, value);
                console.log(`[ONErpm] Selected radio: ${labelText} = ${value}`);
            } catch (err) {
                console.log(`[ONErpm] Could not select radio ${labelText}:`, err.message);
            }
        }

        // Fill all form fields
        await fillInputByLabel('Primary Artist/s', submission.primaryArtist);
        await fillInputByLabel('Featuring Artist/s', submission.featuringArtist);
        await fillInputByLabel('Product Title', submission.productTitle);
        await selectDropdownByLabel('Format', submission.format);
        
        if (submission.focusTrack) {
            await fillInputByLabel('Focus Track', submission.focusTrack);
        }
        
        await fillInputByLabel('Imprint/Label', submission.label || '777heaven Records');
        await fillInputByLabel('UPC/EAN', submission.upc);
        await fillInputByLabel('Spotify URI', submission.spotifyUri);
        
        if (submission.releaseDate) {
            try {
                const dateInput = await page.evaluateHandle(() => {
                    const labels = Array.from(document.querySelectorAll('.freebirdFormviewerComponentsQuestionBaseTitle'));
                    const targetLabel = labels.find(l => l.textContent.trim().includes('Release Date'));
                    if (!targetLabel) return null;
                    const questionDiv = targetLabel.closest('.freebirdFormviewerComponentsQuestionBaseRoot');
                    return questionDiv ? questionDiv.querySelector('input[type="date"]') : null;
                });
                
                const dateElement = dateInput.asElement();
                if (dateElement) {
                    await dateElement.click();
                    await page.keyboard.type(submission.releaseDate);
                    console.log(`[ONErpm] Filled: Release Date`);
                }
            } catch (err) {
                console.log(`[ONErpm] Could not fill Release Date:`, err.message);
            }
        }
        
        await fillInputByLabel('Genre', submission.genre);
        await fillInputByLabel('Artist Image/s Link', submission.artistImages);
        await fillInputByLabel('Spotify Canvas Link', submission.canvasLink);
        await selectRadioByLabel('Is your audio mixed in Dolby Atmos?', submission.dolbyAtmos);
        await fillTextareaByLabel('Artist Bio', submission.artistBio);
        await fillTextareaByLabel('Song Description', submission.songDescription);
        await fillTextareaByLabel('Marketing Blurb', submission.marketingBlurb);
        await fillTextareaByLabel('Socials', submission.socials);
        await fillInputByLabel('Keywords', submission.keywords);
        
        if (submission.promoInfo) {
            await fillTextareaByLabel('Promo Info and Timeline', submission.promoInfo);
        }
        
        if (submission.marketingCampaigns) {
            await fillTextareaByLabel('Marketing Campaigns', submission.marketingCampaigns);
        }

        await page.waitForTimeout(2000);
        console.log('[ONErpm] All fields filled, submitting form...');

        const submitButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            return buttons.find(b => b.textContent.includes('Submit'));
        });

        const submitElement = submitButton.asElement();
        if (submitElement) {
            await submitElement.click();
            console.log('[ONErpm] Submit button clicked');
            
            await page.waitForTimeout(3000);
            
            const confirmationText = await page.evaluate(() => {
                return document.body.textContent.includes('Your response has been recorded') ||
                       document.body.textContent.includes('submitted');
            });

            if (confirmationText) {
                console.log('[ONErpm] ✔ Submission successful!');
                await browser.close();
                return {
                    success: true,
                    message: 'Successfully submitted to ONErpm',
                    submittedAt: new Date().toISOString()
                };
            }
        }

        throw new Error('Could not confirm submission');

    } catch (error) {
        console.error('[ONErpm] Submission error:', error);
        if (browser) await browser.close();
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = { submitToONErpm };