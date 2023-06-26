from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.chrome.options import Options
import time

options=Options()
options.add_experimental_option("detach", True)
driver = webdriver.Chrome(options=options)

driver.get('https://accounts.google.com/')


try:
    username_input = driver.find_element(By.CSS_SELECTOR, 'input[type="text"], input[type="email"], input[name="username"], input[name="email"]')
    username_input.send_keys('youremail')
except NoSuchElementException as e:
    print('找不到帳號輸入欄位')


while True:
    try:
        password_input = driver.find_element(By.CSS_SELECTOR, 'input[type="password"], input[name="password"]')
        password_input.send_keys('yourpassword')
        break
    except Exception as e: 
        next_button = driver.find_element(By.ID, 'identifierNext')
        next_button.click()
        time.sleep(3)
        continue


=======
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time

options=Options()
options.add_experimental_option("detach", True)
browser = webdriver.Chrome(options=options)


browser.get("https://elearning.ntcu.edu.tw/")

username = browser.find_element(By.ID, "username")
password = browser.find_element(By.ID, "password")

username.send_keys("username")
password.send_keys("password")

