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