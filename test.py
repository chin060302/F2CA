<<<<<<< HEAD
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

# 使用Selenium開啟瀏覽器
driver = webdriver.Chrome('C:\Users\黃川赫\Downloads\chromedriver_win32\chromedriver.exe')  # 請確保已下載並安裝ChromeDriver，並指定正確的路徑

# 前往登入頁面
driver.get('https://accounts.google.com/')

# 找到帳號和密碼的輸入框，並填入相應的資訊
username_input = driver.find_element_by_name('username')
username_input.send_keys('acs109144@gm.ntcu.edu.tw')
password_input = driver.find_element_by_name('password')
password_input.send_keys('atwert8232')

# 提交表單
password_input.send_keys(Keys.ENTER)

# 登入後的操作，可根據需要進行相應的操作
# ...

# 關閉瀏覽器
#driver.quit()
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
>>>>>>> 2c43768e18edab4544ab0537d3cf7e36a493cd9b
