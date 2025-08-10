#!/bin/sh

if [ -z "$1" ]; then
  set -- "${1:-XX100}"
fi

if [ -z "$2" ]; then
  set -- "${2:-10.42.0.55}"
fi

if [ -z "$3" ]; then
  set -- "${3:-YES}"
fi

echo "Installing [...]"
echo "HUB Name: $1"
echo "Tablet IP: $2"
echo "Install PiTunnel: $3"
sleep 5

sudo apt-get -y install screen elinks minicom ppp

echo "Setting up [...]"
sleep 1

# sudo sed -i -e '$i \sh /home/umine/setup.gl/SIM7600X-4G-HAT-Demo/Raspberry/c/sim7600_4G_hat_init &\n' /etc/rc.local
# sudo sed -i -e '$i \(sleep 30 &\n' /etc/rc.local
# sudo sed -i -e '$i \ifconfig eth0 down &\n' /etc/rc.local
# sudo sed -i -e '$i \ifconfig wwan0 down) & &\n' /etc/rc.local

if grep -q iptables "/etc/rc.local"; 
  then
    echo "Skipping ..."
  else
    sudo sed -i -e '$i \iptables -A FORWARD -s 10.42.0.0/24 -j DROP\n' /etc/rc.local 
fi

echo "Setting up [RNET]"
sleep 2

sudo touch /etc/ppp/peers/rnet
sudo cat > /etc/ppp/peers/rnet << EOL
connect "/usr/sbin/chat -v -f /etc/chatscripts/gprs -T net"
/dev/ttyS0
921600
noipdefault
usepeerdns
defaultroute
replacedefaultroute
persist
noauth
nocrtscts
local
lock
passive
holdoff 5
maxfail 0
EOL

echo "Setting up [GPRS]"
sleep 2

sudo touch /etc/chatscripts/gprs
sudo cat > /etc/chatscripts/gprs << EOL
ABORT           BUSY
ABORT           VOICE
ABORT           "NO CARRIER"
ABORT           "NO DIALTONE"
ABORT           "NO DIAL TONE"
ABORT           "NO ANSWER"
ABORT           "DELAYED"
ABORT           "ERROR"
ABORT           "+CGATT: 0"
""              AT
""              AT+CSQ
""              AT+COPS?
""              AT+CPSI?
TIMEOUT         12
OK              ATH
OK              ATE1
OK              AT+CGDCONT=1,"IP","\T","",0,0
OK              ATD*99#
TIMEOUT         22
CONNECT         ""
EOL

echo "Setting up [Interfaces]"
sleep 2

sudo touch /etc/network/interfaces
sudo cat > /etc/network/interfaces << EOL
source /etc/network/interfaces.d/*
auto rnet
iface rnet inet ppp
provider rnet
EOL

echo "Setting up [Router.Priority]"
sleep 2

sudo touch /etc/dhcpcd.conf
sudo cat > /etc/dhcpcd.conf << EOL
interface wlan1
metric 201
EOL

echo "Setting up [USB.Rules]"
sleep 2

sudo touch /etc/udev/rules.d/99-usb.rules
sudo cat > /etc/udev/rules.d/99-usb.rules << EOL
KERNELS=="1-1.1", SUBSYSTEMS=="usb", SYMLINK+="uGPS1"
KERNELS=="1-1.2", SUBSYSTEMS=="usb", SYMLINK+="uGPS2"
KERNELS=="1-1.3:1.2", SUBSYSTEMS=="usb", SYMLINK+="uModem"
EOL

echo "Setting up [Pitunnel.Ports]"
sleep 2

if [ "$3" == "YES" ]; then
curl -s pitunnel.com/get/EpsCY2MrwX | sudo bash
sleep 2
fi

pitunnel --port=5900 --persist --name=$1-PI
pitunnel --port=8443 --http --persist --name=$1
pitunnel --port=5900 --host=$2 --persist --name=$1-TABLET

echo "Installing Node / Redis / PM2 [...]"

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

NODE_MAJOR=18
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt-get -y install nodejs
sudo apt-get -y install npm
sudo apt-get -y install nginx
sudo apt-get -y install redis-server
sudo apt-get -y install iptables
sudo npm install yarn -g
sudo npm install pm2@latest -g
pm2 install pm2-logrotate

echo "Disabling ModemManager... / Due to Nodejs SerialPort error"
systemctl disable ModemManager.service
systemctl stop ModemManager.service

# echo "Enabling VNC server..."
# sudo systemctl enable vncserver-x11-serviced.service
# sudo systemctl start vncserver-x11-serviced.service

echo "Cloning & Installing Vehicle.gl [...]"

git clone https://github.com/gl-fleet/vehicle.gl.git

cd vehicle.gl
yarn install

# yarn build
# yarn serve
# pm2 startup
# pm2 save

sleep 5

# Configure followings after rebooting the system ->

# Enable serial port: Interface Options -> # Serial -> no -> yes to disable serial debugging
# echo -e "AT+IPREX=460800\r" > /dev/ttyUSB2
