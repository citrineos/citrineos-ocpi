# SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
#
# SPDX-License-Identifier: Apache-2.0

http-server /tmp/everest_ocpp_logs -p 8888 &
chmod +x /ext/source/build/run-scripts/run-sil-ocpp201-pnc.sh
/ext/source/build/run-scripts/run-sil-ocpp201-pnc.sh